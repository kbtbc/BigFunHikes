/**
 * ActivityMap - Mapbox GL animated map for activity playback
 * Shows route with heatmap coloring, animated marker, 3D terrain, and camera modes
 */

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ActivityDataPoint, ActivityPhoto } from "@/lib/activity-data-parser";
import { getGradientColor } from "@/lib/activity-data-parser";

// Set Mapbox token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

export type ColorMode = "speed" | "hr" | "elevation";
export type CameraMode = "follow" | "overview" | "firstPerson";
export type MapStyle = "outdoors" | "satellite";

interface ActivityMapProps {
  dataPoints: ActivityDataPoint[];
  currentIndex: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  colorMode: ColorMode;
  cameraMode: CameraMode;
  mapStyle: MapStyle;
  terrain3D: boolean;
  hasHeartRate: boolean;
  photos?: ActivityPhoto[];
  highlightedSegment?: { start: number; end: number } | null;
  onPhotoClick?: (photo: ActivityPhoto) => void;
}

export interface ActivityMapRef {
  flyToSegment: (startIndex: number, endIndex: number) => void;
}

export const ActivityMap = forwardRef<ActivityMapRef, ActivityMapProps>(function ActivityMap(
  {
    dataPoints,
    currentIndex,
    bounds,
    colorMode,
    cameraMode,
    mapStyle,
    terrain3D,
    hasHeartRate,
    photos = [],
    highlightedSegment,
    onPhotoClick,
  },
  ref
) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const photoMarkers = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleReady, setStyleReady] = useState(false); // Track when style is fully loaded
  const [terrainLoaded, setTerrainLoaded] = useState(false);
  const lastCameraUpdate = useRef<number>(0);
  const lastBearing = useRef<number>(0); // For smoothing first-person camera
  const lastZoom = useRef<number>(14); // Track zoom to prevent jitter

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    flyToSegment: (startIndex: number, endIndex: number) => {
      if (!map.current || !mapLoaded) return;

      const startPoint = dataPoints[startIndex];
      const endPoint = dataPoints[endIndex];
      if (!startPoint || !endPoint) return;

      // Calculate center and zoom for segment
      const centerLat = (startPoint.lat + endPoint.lat) / 2;
      const centerLon = (startPoint.lon + endPoint.lon) / 2;

      map.current.flyTo({
        center: [centerLon, centerLat],
        zoom: 14,
        pitch: terrain3D ? 60 : 45,
        duration: 1000,
      });
    },
  }));

  // Calculate bearing between two points
  const calculateBearing = useCallback(
    (p1: ActivityDataPoint, p2: ActivityDataPoint): number => {
      const lon1 = (p1.lon * Math.PI) / 180;
      const lon2 = (p2.lon * Math.PI) / 180;
      const lat1 = (p1.lat * Math.PI) / 180;
      const lat2 = (p2.lat * Math.PI) / 180;

      const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
      const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);

      return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    },
    []
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle === "satellite"
        ? "mapbox://styles/mapbox/satellite-streets-v12"
        : "mapbox://styles/mapbox/outdoors-v12",
      center: [
        (bounds.east + bounds.west) / 2,
        (bounds.north + bounds.south) / 2,
      ],
      zoom: 13,
      pitch: 45,
      bearing: 0,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
      setStyleReady(true);

      // Fit to bounds
      map.current?.fitBounds(
        [
          [bounds.west, bounds.south],
          [bounds.east, bounds.north],
        ],
        {
          padding: 50,
          maxZoom: 15,
        }
      );

      // Store initial zoom
      lastZoom.current = map.current?.getZoom() ?? 14;
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [bounds]);

  // Handle map style changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentStyle = map.current.getStyle()?.sprite;
    const isSatellite = currentStyle?.includes("satellite");
    const wantsSatellite = mapStyle === "satellite";

    // Only change if different
    if (isSatellite === wantsSatellite) return;

    const styleUrl = mapStyle === "satellite"
      ? "mapbox://styles/mapbox/satellite-streets-v12"
      : "mapbox://styles/mapbox/outdoors-v12";

    // Mark style as not ready
    setStyleReady(false);

    map.current.setStyle(styleUrl);

    // Re-add layers after style change
    map.current.once("style.load", () => {
      setStyleReady(true);
    });
  }, [mapStyle, mapLoaded]);

  // Add/remove 3D terrain
  useEffect(() => {
    if (!map.current || !mapLoaded || !styleReady) return;

    if (terrain3D) {
      // Add terrain source if not exists
      if (!map.current.getSource("mapbox-dem")) {
        map.current.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }

      // Increased exaggeration for more dramatic terrain
      map.current.setTerrain({ source: "mapbox-dem", exaggeration: 2.5 });

      // Add sky layer for better 3D effect
      if (!map.current.getLayer("sky")) {
        map.current.addLayer({
          id: "sky",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [0.0, 90.0],
            "sky-atmosphere-sun-intensity": 15,
          },
        });
      }

      setTerrainLoaded(true);
    } else {
      // Remove terrain
      map.current.setTerrain(null);
      if (map.current.getLayer("sky")) {
        map.current.removeLayer("sky");
      }
      setTerrainLoaded(false);
    }
  }, [terrain3D, mapLoaded, styleReady]);

  // Add route layer with heatmap coloring
  useEffect(() => {
    if (!map.current || !mapLoaded || !styleReady || dataPoints.length < 2) return;

    // Remove existing layers and sources (in reverse order of addition)
    const layersToRemove = [
      "route-highlight",
      "route-progress",
      "route-segments",
      "route-base",
    ];
    const sourcesToRemove = [
      "route-highlight",
      "route-progress",
      "route-segments",
      "route-base",
    ];

    layersToRemove.forEach((layer) => {
      if (map.current?.getLayer(layer)) {
        map.current.removeLayer(layer);
      }
    });
    sourcesToRemove.forEach((source) => {
      if (map.current?.getSource(source)) {
        map.current.removeSource(source);
      }
    });

    // Create a continuous line for the entire route (prevents gaps)
    const allCoordinates = dataPoints.map((p) => [p.lon, p.lat]);

    // Add base route layer (continuous, no gaps)
    map.current.addSource("route-base", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: allCoordinates,
        },
      },
    });

    map.current.addLayer({
      id: "route-base",
      type: "line",
      source: "route-base",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#888888",
        "line-width": 5,
        "line-opacity": 0.3,
      },
    });

    // Calculate min/max for color scaling
    let values: number[] = [];
    if (colorMode === "speed") {
      values = dataPoints
        .map((p) => p.speed)
        .filter((v): v is number => v !== undefined);
    } else if (colorMode === "hr" && hasHeartRate) {
      values = dataPoints
        .map((p) => p.hr)
        .filter((v): v is number => v !== undefined);
    } else {
      values = dataPoints
        .map((p) => p.elevation)
        .filter((v): v is number => v !== undefined);
    }

    const minVal = values.length > 0 ? Math.min(...values) : 0;
    const maxVal = values.length > 0 ? Math.max(...values) : 1;

    // Create line segments with colors (overlaid on base)
    const features: GeoJSON.Feature[] = [];

    for (let i = 0; i < dataPoints.length - 1; i++) {
      const p1 = dataPoints[i];
      const p2 = dataPoints[i + 1];

      let value = 0;
      if (colorMode === "speed") {
        value = p1.speed ?? 0;
      } else if (colorMode === "hr" && hasHeartRate) {
        value = p1.hr ?? 0;
      } else {
        value = p1.elevation ?? 0;
      }

      const color = getGradientColor(
        value,
        minVal,
        maxVal,
        colorMode === "hr" ? "hr" : colorMode === "elevation" ? "elevation" : "speed"
      );

      features.push({
        type: "Feature",
        properties: { color, index: i },
        geometry: {
          type: "LineString",
          coordinates: [
            [p1.lon, p1.lat],
            [p2.lon, p2.lat],
          ],
        },
      });
    }

    // Add colored route segments source
    map.current.addSource("route-segments", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features,
      },
    });

    // Add colored segments layer
    map.current.addLayer({
      id: "route-segments",
      type: "line",
      source: "route-segments",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": ["get", "color"],
        "line-width": 4,
        "line-opacity": 0.6,
      },
    });

    // Add progress layer (highlighted portion)
    map.current.addSource("route-progress", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });

    map.current.addLayer({
      id: "route-progress",
      type: "line",
      source: "route-progress",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": ["get", "color"],
        "line-width": 6,
        "line-opacity": 1,
      },
    });

    // Add highlight layer for segment selection
    map.current.addSource("route-highlight", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });

    map.current.addLayer({
      id: "route-highlight",
      type: "line",
      source: "route-highlight",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#ffff00",
        "line-width": 8,
        "line-opacity": 0.8,
      },
    });
  }, [mapLoaded, styleReady, dataPoints, colorMode, hasHeartRate]);

  // Update highlighted segment (from chart click)
  useEffect(() => {
    if (!map.current || !mapLoaded || !map.current.getSource("route-highlight")) return;

    if (!highlightedSegment) {
      (map.current.getSource("route-highlight") as mapboxgl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: [],
      });
      return;
    }

    const { start, end } = highlightedSegment;
    const highlightCoords: [number, number][] = [];

    for (let i = start; i <= Math.min(end, dataPoints.length - 1); i++) {
      highlightCoords.push([dataPoints[i].lon, dataPoints[i].lat]);
    }

    if (highlightCoords.length >= 2) {
      (map.current.getSource("route-highlight") as mapboxgl.GeoJSONSource).setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: highlightCoords,
        },
      });
    }
  }, [highlightedSegment, mapLoaded, dataPoints]);

  // Update progress line as playback advances
  useEffect(() => {
    if (!map.current || !mapLoaded || !map.current.getSource("route-progress")) return;

    // Calculate min/max for color scaling
    let values: number[] = [];
    if (colorMode === "speed") {
      values = dataPoints
        .map((p) => p.speed)
        .filter((v): v is number => v !== undefined);
    } else if (colorMode === "hr" && hasHeartRate) {
      values = dataPoints
        .map((p) => p.hr)
        .filter((v): v is number => v !== undefined);
    } else {
      values = dataPoints
        .map((p) => p.elevation)
        .filter((v): v is number => v !== undefined);
    }

    const minVal = values.length > 0 ? Math.min(...values) : 0;
    const maxVal = values.length > 0 ? Math.max(...values) : 1;

    // Create highlighted features for traveled path
    const progressFeatures: GeoJSON.Feature[] = [];

    for (let i = 0; i < Math.min(currentIndex, dataPoints.length - 1); i++) {
      const p1 = dataPoints[i];
      const p2 = dataPoints[i + 1];

      let value = 0;
      if (colorMode === "speed") {
        value = p1.speed ?? 0;
      } else if (colorMode === "hr" && hasHeartRate) {
        value = p1.hr ?? 0;
      } else {
        value = p1.elevation ?? 0;
      }

      const color = getGradientColor(
        value,
        minVal,
        maxVal,
        colorMode === "hr" ? "hr" : colorMode === "elevation" ? "elevation" : "speed"
      );

      progressFeatures.push({
        type: "Feature",
        properties: { color },
        geometry: {
          type: "LineString",
          coordinates: [
            [p1.lon, p1.lat],
            [p2.lon, p2.lat],
          ],
        },
      });
    }

    (map.current.getSource("route-progress") as mapboxgl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: progressFeatures,
    });
  }, [currentIndex, mapLoaded, dataPoints, colorMode, hasHeartRate]);

  // Create and update animated marker + camera following
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentPoint = dataPoints[currentIndex];
    if (!currentPoint) return;

    if (!marker.current) {
      // Create custom marker element
      const el = document.createElement("div");
      el.className = "activity-marker";
      el.style.cssText = `
        width: 20px;
        height: 20px;
        background: #ff6b00;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
      `;

      marker.current = new mapboxgl.Marker({ element: el })
        .setLngLat([currentPoint.lon, currentPoint.lat])
        .addTo(map.current);
    } else {
      marker.current.setLngLat([currentPoint.lon, currentPoint.lat]);
    }

    // Camera behavior based on mode
    const now = Date.now();
    const timeSinceLastUpdate = now - lastCameraUpdate.current;

    // Only update camera periodically to avoid jerky movement
    // Increase threshold for smoother movement
    if (timeSinceLastUpdate < 300 && cameraMode !== "overview") return;
    lastCameraUpdate.current = now;

    if (cameraMode === "follow") {
      // Follow mode: smooth pan to keep marker centered with consistent zoom
      const targetZoom = 14.5; // Fixed zoom level for follow mode

      map.current.easeTo({
        center: [currentPoint.lon, currentPoint.lat],
        zoom: targetZoom,
        pitch: terrain3D ? 60 : 45,
        duration: 500, // Longer duration for smoother transition
        easing: (t) => t * (2 - t), // Ease-out quad for smooth deceleration
      });
    } else if (cameraMode === "firstPerson") {
      // First-person mode: look ahead in direction of travel with smoothed bearing
      // Look further ahead for smoother direction changes
      const lookAheadIndex = Math.min(currentIndex + 15, dataPoints.length - 1);
      const lookAheadPoint = dataPoints[lookAheadIndex];

      if (lookAheadPoint && lookAheadPoint !== currentPoint) {
        const targetBearing = calculateBearing(currentPoint, lookAheadPoint);

        // Smooth bearing transition to avoid jerky rotation
        // Calculate shortest rotation direction
        let bearingDiff = targetBearing - lastBearing.current;
        if (bearingDiff > 180) bearingDiff -= 360;
        if (bearingDiff < -180) bearingDiff += 360;

        // Ease toward target bearing (lerp factor 0.1 for smoother transition)
        const smoothedBearing = lastBearing.current + bearingDiff * 0.1;
        lastBearing.current = ((smoothedBearing % 360) + 360) % 360;

        const targetZoom = 15.5; // Fixed zoom for first-person

        map.current.easeTo({
          center: [currentPoint.lon, currentPoint.lat],
          bearing: lastBearing.current,
          pitch: terrain3D ? 70 : 55,
          zoom: targetZoom,
          duration: 400, // Longer duration for smoother transition
          easing: (t) => t * (2 - t), // Ease-out quad
        });
      }
    }
    // Overview mode: no camera movement (user controls)
  }, [currentIndex, mapLoaded, dataPoints, cameraMode, terrain3D, calculateBearing]);

  // Add photo markers with timestamps
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing photo markers
    photoMarkers.current.forEach((m) => m.remove());
    photoMarkers.current = [];

    // Add new photo markers
    photos.forEach((photo) => {
      if (photo.lat === undefined || photo.lon === undefined) return;

      const el = document.createElement("div");
      el.className = "photo-marker";

      // Check if this photo should be visible based on playback position
      const isVisible = photo.timestamp === undefined ||
        (dataPoints[currentIndex]?.timestamp ?? 0) >= photo.timestamp;

      el.style.cssText = `
        width: 32px;
        height: 32px;
        background: white;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        background-image: url(${photo.url});
        background-size: cover;
        background-position: center;
        border: 2px solid white;
        opacity: ${isVisible ? 1 : 0.3};
        transition: opacity 0.3s, transform 0.3s;
        transform: scale(${isVisible ? 1 : 0.8});
      `;

      el.addEventListener("click", () => {
        onPhotoClick?.(photo);
      });

      const photoMarker = new mapboxgl.Marker({ element: el })
        .setLngLat([photo.lon, photo.lat])
        .addTo(map.current!);

      photoMarkers.current.push(photoMarker);
    });

    return () => {
      photoMarkers.current.forEach((m) => m.remove());
      photoMarkers.current = [];
    };
  }, [photos, mapLoaded, onPhotoClick, currentIndex, dataPoints]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full rounded-lg overflow-hidden"
      style={{ minHeight: "300px" }}
    />
  );
});
