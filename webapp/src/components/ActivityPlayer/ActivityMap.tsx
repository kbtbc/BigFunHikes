/**
 * ActivityMap - Mapbox GL animated map for activity playback
 * Shows route with heatmap coloring and animated marker
 */

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ActivityDataPoint, ActivityPhoto } from "@/lib/activity-data-parser";
import { getGradientColor } from "@/lib/activity-data-parser";

// Set Mapbox token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

export type ColorMode = "speed" | "hr" | "elevation";

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
  hasHeartRate: boolean;
  photos?: ActivityPhoto[];
  onPhotoClick?: (photo: ActivityPhoto) => void;
}

export function ActivityMap({
  dataPoints,
  currentIndex,
  bounds,
  colorMode,
  hasHeartRate,
  photos = [],
  onPhotoClick,
}: ActivityMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const photoMarkers = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [
        (bounds.east + bounds.west) / 2,
        (bounds.north + bounds.south) / 2,
      ],
      zoom: 13,
      pitch: 45, // Slight 3D tilt
      bearing: 0,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);

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
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [bounds]);

  // Add route layer with heatmap coloring
  useEffect(() => {
    if (!map.current || !mapLoaded || dataPoints.length < 2) return;

    // Remove existing layers and sources (in reverse order of addition)
    const layersToRemove = ["route-progress", "route-segments", "route-base"];
    const sourcesToRemove = ["route-progress", "route-segments", "route-base"];

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

      const color = getGradientColor(value, minVal, maxVal, colorMode === "hr" ? "hr" : colorMode === "elevation" ? "elevation" : "speed");

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
  }, [mapLoaded, dataPoints, colorMode, hasHeartRate]);

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

      const color = getGradientColor(value, minVal, maxVal, colorMode === "hr" ? "hr" : colorMode === "elevation" ? "elevation" : "speed");

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

  // Create and update animated marker
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

    // Update map center to follow marker (with some lag)
    if (currentIndex > 0 && currentIndex % 5 === 0) {
      map.current.easeTo({
        center: [currentPoint.lon, currentPoint.lat],
        duration: 500,
      });
    }
  }, [currentIndex, mapLoaded, dataPoints]);

  // Add photo markers
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
  }, [photos, mapLoaded, onPhotoClick]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full rounded-lg overflow-hidden"
      style={{ minHeight: "300px" }}
    />
  );
}
