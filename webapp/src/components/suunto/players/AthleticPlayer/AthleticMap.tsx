/**
 * Athletic Map - Mapbox GL map for Athletic player style (ESPN Broadcast)
 *
 * Color scheme: Bold Red (#dc2626) + White + Dark Charcoal (#1f2937)
 * Sports broadcast aesthetic with satellite view and 3D terrain
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ActivityDataPoint } from "@/lib/activity-data-parser";
import { getGradientColor } from "@/lib/activity-data-parser";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

export type ColorMode = "speed" | "hr" | "elevation";
export type CameraMode = "follow" | "overview" | "firstPerson";
export type MapStyle = "satellite" | "outdoors";

export interface AthleticMapRef {
  flyToSegment: (startIndex: number, endIndex: number) => void;
}

interface AthleticMapProps {
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
  temperature?: number;
  highlightedSegment?: { start: number; end: number } | null;
}

export const AthleticMap = forwardRef<AthleticMapRef, AthleticMapProps>(function AthleticMap({
  dataPoints,
  currentIndex,
  bounds,
  colorMode,
  cameraMode,
  mapStyle,
  terrain3D,
  hasHeartRate,
  temperature,
  highlightedSegment,
}, ref) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleReady, setStyleReady] = useState(false);
  const lastCameraUpdate = useRef<number>(0);
  const lastBearing = useRef<number>(0);

  // Expose flyToSegment method
  useImperativeHandle(ref, () => ({
    flyToSegment: (startIndex: number, endIndex: number) => {
      if (!map.current) return;

      const segmentPoints = dataPoints.slice(startIndex, endIndex + 1);
      if (segmentPoints.length < 2) return;

      const lngs = segmentPoints.map(p => p.lon);
      const lats = segmentPoints.map(p => p.lat);

      map.current.fitBounds([
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ], { padding: 80, maxZoom: 16, duration: 1000 });
    }
  }));

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
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

      map.current?.fitBounds(
        [
          [bounds.west, bounds.south],
          [bounds.east, bounds.north],
        ],
        { padding: 50, maxZoom: 15 }
      );
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [bounds]);

  // Add 3D terrain with sky atmosphere
  useEffect(() => {
    if (!map.current || !mapLoaded || !styleReady) return;

    if (terrain3D) {
      if (!map.current.getSource("mapbox-dem")) {
        map.current.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }

      map.current.setTerrain({ source: "mapbox-dem", exaggeration: 1.8 });

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
    } else {
      map.current.setTerrain(null);
      if (map.current.getLayer("sky")) {
        map.current.removeLayer("sky");
      }
    }
  }, [terrain3D, mapLoaded, styleReady]);

  // Handle map style changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const styleUrl = mapStyle === "satellite"
      ? "mapbox://styles/mapbox/satellite-streets-v12"
      : "mapbox://styles/mapbox/outdoors-v12";

    // Check if style is different
    const currentStyle = map.current.getStyle();
    if (currentStyle?.sprite?.includes(mapStyle)) return;

    // Save current view
    const center = map.current.getCenter();
    const zoom = map.current.getZoom();
    const pitch = map.current.getPitch();
    const bearing = map.current.getBearing();

    setStyleReady(false);

    map.current.setStyle(styleUrl);

    map.current.once("style.load", () => {
      setStyleReady(true);
      // Restore view
      map.current?.setCenter(center);
      map.current?.setZoom(zoom);
      map.current?.setPitch(pitch);
      map.current?.setBearing(bearing);
    });
  }, [mapStyle, mapLoaded]);

  // Add route layers
  useEffect(() => {
    if (!map.current || !mapLoaded || !styleReady || dataPoints.length < 2) return;

    // Remove existing layers
    ["route-highlight", "route-progress", "route-segments", "route-base"].forEach((layer) => {
      if (map.current?.getLayer(layer)) map.current.removeLayer(layer);
    });
    ["route-highlight", "route-progress", "route-segments", "route-base"].forEach((source) => {
      if (map.current?.getSource(source)) map.current.removeSource(source);
    });

    const allCoordinates = dataPoints.map((p) => [p.lon, p.lat]);

    // Base route - Athletic red with white border effect
    map.current.addSource("route-base", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: allCoordinates },
      },
    });

    map.current.addLayer({
      id: "route-base",
      type: "line",
      source: "route-base",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.4 },
    });

    // Calculate color values
    let values: number[] = [];
    if (colorMode === "speed") {
      values = dataPoints.map((p) => p.speed).filter((v): v is number => v !== undefined);
    } else if (colorMode === "hr" && hasHeartRate) {
      values = dataPoints.map((p) => p.hr).filter((v): v is number => v !== undefined);
    } else {
      values = dataPoints.map((p) => p.elevation).filter((v): v is number => v !== undefined);
    }

    const minVal = values.length > 0 ? Math.min(...values) : 0;
    const maxVal = values.length > 0 ? Math.max(...values) : 1;

    // Colored segments
    const features: GeoJSON.Feature[] = [];
    for (let i = 0; i < dataPoints.length - 1; i++) {
      const p1 = dataPoints[i];
      const p2 = dataPoints[i + 1];

      let value = 0;
      if (colorMode === "speed") value = p1.speed ?? 0;
      else if (colorMode === "hr" && hasHeartRate) value = p1.hr ?? 0;
      else value = p1.elevation ?? 0;

      const color = getGradientColor(
        value,
        minVal,
        maxVal,
        colorMode === "hr" ? "hr" : colorMode === "elevation" ? "elevation" : "speed"
      );

      features.push({
        type: "Feature",
        properties: { color },
        geometry: { type: "LineString", coordinates: [[p1.lon, p1.lat], [p2.lon, p2.lat]] },
      });
    }

    map.current.addSource("route-segments", {
      type: "geojson",
      data: { type: "FeatureCollection", features },
    });

    map.current.addLayer({
      id: "route-segments",
      type: "line",
      source: "route-segments",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": ["get", "color"], "line-width": 4, "line-opacity": 0.5 },
    });

    // Progress layer
    map.current.addSource("route-progress", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.current.addLayer({
      id: "route-progress",
      type: "line",
      source: "route-progress",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": ["get", "color"], "line-width": 6, "line-opacity": 1 },
    });
  }, [mapLoaded, styleReady, dataPoints, colorMode, hasHeartRate]);

  // Update progress
  useEffect(() => {
    if (!map.current || !mapLoaded || !map.current.getSource("route-progress")) return;

    let values: number[] = [];
    if (colorMode === "speed") {
      values = dataPoints.map((p) => p.speed).filter((v): v is number => v !== undefined);
    } else if (colorMode === "hr" && hasHeartRate) {
      values = dataPoints.map((p) => p.hr).filter((v): v is number => v !== undefined);
    } else {
      values = dataPoints.map((p) => p.elevation).filter((v): v is number => v !== undefined);
    }

    const minVal = values.length > 0 ? Math.min(...values) : 0;
    const maxVal = values.length > 0 ? Math.max(...values) : 1;

    const progressFeatures: GeoJSON.Feature[] = [];
    for (let i = 0; i < Math.min(currentIndex, dataPoints.length - 1); i++) {
      const p1 = dataPoints[i];
      const p2 = dataPoints[i + 1];

      let value = 0;
      if (colorMode === "speed") value = p1.speed ?? 0;
      else if (colorMode === "hr" && hasHeartRate) value = p1.hr ?? 0;
      else value = p1.elevation ?? 0;

      const color = getGradientColor(
        value,
        minVal,
        maxVal,
        colorMode === "hr" ? "hr" : colorMode === "elevation" ? "elevation" : "speed"
      );

      progressFeatures.push({
        type: "Feature",
        properties: { color },
        geometry: { type: "LineString", coordinates: [[p1.lon, p1.lat], [p2.lon, p2.lat]] },
      });
    }

    (map.current.getSource("route-progress") as mapboxgl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: progressFeatures,
    });
  }, [currentIndex, mapLoaded, dataPoints, colorMode, hasHeartRate]);

  // Update marker and camera
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentPoint = dataPoints[currentIndex];
    if (!currentPoint) return;

    // Athletic-styled marker - bold red with white border
    if (!marker.current) {
      const el = document.createElement("div");
      el.style.cssText = `
        width: 24px;
        height: 24px;
        background: #dc2626;
        border: 4px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 12px rgba(0,0,0,0.4), 0 0 0 2px #dc2626;
      `;

      marker.current = new mapboxgl.Marker({ element: el })
        .setLngLat([currentPoint.lon, currentPoint.lat])
        .addTo(map.current);
    } else {
      marker.current.setLngLat([currentPoint.lon, currentPoint.lat]);
    }

    // Skip camera updates in overview mode
    if (cameraMode === "overview") return;

    // Throttle camera updates
    const now = Date.now();
    if (now - lastCameraUpdate.current < 150) return;
    lastCameraUpdate.current = now;

    if (cameraMode === "follow") {
      // Follow mode: smooth pan to keep marker centered
      map.current.easeTo({
        center: [currentPoint.lon, currentPoint.lat],
        zoom: 15.5,
        duration: 200,
        easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
      });
    } else if (cameraMode === "firstPerson") {
      // First-person mode: look ahead in direction of travel
      const nextIndex = Math.min(currentIndex + 5, dataPoints.length - 1);
      const nextPoint = dataPoints[nextIndex];

      if (nextPoint && (nextPoint.lat !== currentPoint.lat || nextPoint.lon !== currentPoint.lon)) {
        // Calculate bearing to next point
        const dLon = (nextPoint.lon - currentPoint.lon) * Math.PI / 180;
        const lat1 = currentPoint.lat * Math.PI / 180;
        const lat2 = nextPoint.lat * Math.PI / 180;
        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        const targetBearing = Math.atan2(y, x) * 180 / Math.PI;

        // Smooth bearing transitions
        const bearingDiff = targetBearing - lastBearing.current;
        const normalizedDiff = ((bearingDiff + 540) % 360) - 180;
        lastBearing.current = lastBearing.current + normalizedDiff * 0.08;

        map.current.easeTo({
          center: [currentPoint.lon, currentPoint.lat],
          bearing: lastBearing.current,
          pitch: 70,
          zoom: 14,
          duration: 200,
          easing: (t) => 1 - Math.pow(1 - t, 3), // ease-out cubic
        });
      }
    }
  }, [currentIndex, mapLoaded, dataPoints, cameraMode]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* ESPN-style broadcast badge */}
      <div className="absolute top-3 left-3 flex items-center gap-3">
        {/* Live indicator */}
        <div className="flex items-center gap-2 bg-[#dc2626] px-3 py-1.5 rounded">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span className="font-bold text-white text-xs tracking-wider">LIVE</span>
        </div>

        {/* Temperature badge */}
        {temperature !== undefined && (
          <div className="bg-[#1f2937]/90 backdrop-blur-sm px-3 py-1.5 rounded">
            <span className="font-mono font-bold text-white text-sm">{temperature}°F</span>
          </div>
        )}
      </div>

      {/* Bottom ESPN-style label */}
      <div className="absolute bottom-3 left-3 bg-[#1f2937]/90 backdrop-blur-sm rounded px-3 py-1.5">
        <span className="font-bold text-white text-xs tracking-wide">REPLAY STUDIO</span>
      </div>
    </div>
  );
});
