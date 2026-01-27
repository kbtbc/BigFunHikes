/**
 * Terminal Map - Green-tinted hacker aesthetic map
 *
 * Color scheme: Black (#0D0D0D) + Green (#00FF00) + Amber (#FFB000)
 * Dark map style with green overlay filter for matrix/hacker vibe
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ActivityDataPoint } from "@/lib/activity-data-parser";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

export type ColorMode = "speed" | "hr" | "elevation";
export type CameraMode = "follow" | "overview";

export interface TerminalMapRef {
  flyToSegment: (startIndex: number, endIndex: number) => void;
}

interface TerminalMapProps {
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
  hasHeartRate: boolean;
}

// Terminal-style gradient colors (green to amber)
function getTerminalColor(
  value: number,
  min: number,
  max: number,
  mode: ColorMode
): string {
  if (value === undefined || value === null || isNaN(value)) {
    return "#00FF00";
  }

  let ratio = max === min ? 0.5 : (value - min) / (max - min);
  ratio = Math.max(0, Math.min(1, ratio));

  // Green to amber gradient for terminal aesthetic
  const r = Math.round(255 * ratio);
  const g = Math.round(255 - (80 * ratio));
  const b = 0;

  return `rgb(${r}, ${g}, ${b})`;
}

export const TerminalMap = forwardRef<TerminalMapRef, TerminalMapProps>(function TerminalMap({
  dataPoints,
  currentIndex,
  bounds,
  colorMode,
  cameraMode,
  hasHeartRate,
}, ref) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const lastCameraUpdate = useRef<number>(0);

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
      ], { padding: 60, maxZoom: 16, duration: 800 });
    }
  }));

  // Initialize map with dark style
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [
        (bounds.east + bounds.west) / 2,
        (bounds.north + bounds.south) / 2,
      ],
      zoom: 13,
      pitch: 0,
      bearing: 0,
    });

    // Minimal navigation control
    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    map.current.on("load", () => {
      setMapLoaded(true);

      map.current?.fitBounds(
        [
          [bounds.west, bounds.south],
          [bounds.east, bounds.north],
        ],
        { padding: 40, maxZoom: 15 }
      );
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [bounds]);

  // Add route layers
  useEffect(() => {
    if (!map.current || !mapLoaded || dataPoints.length < 2) return;

    // Remove existing layers
    ["route-progress", "route-segments", "route-base", "route-glow"].forEach((layer) => {
      if (map.current?.getLayer(layer)) map.current.removeLayer(layer);
    });
    ["route-progress", "route-segments", "route-base", "route-glow"].forEach((source) => {
      if (map.current?.getSource(source)) map.current.removeSource(source);
    });

    const allCoordinates = dataPoints.map((p) => [p.lon, p.lat]);

    // Base route - dim green wireframe
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
      paint: { "line-color": "#003300", "line-width": 3, "line-opacity": 0.6 },
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

    // Colored segments - green to amber terminal colors
    const features: GeoJSON.Feature[] = [];
    for (let i = 0; i < dataPoints.length - 1; i++) {
      const p1 = dataPoints[i];
      const p2 = dataPoints[i + 1];

      let value = 0;
      if (colorMode === "speed") value = p1.speed ?? 0;
      else if (colorMode === "hr" && hasHeartRate) value = p1.hr ?? 0;
      else value = p1.elevation ?? 0;

      const color = getTerminalColor(value, minVal, maxVal, colorMode);

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
      paint: { "line-color": ["get", "color"], "line-width": 2, "line-opacity": 0.3 },
    });

    // Progress glow layer - bright green glow effect
    map.current.addSource("route-glow", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.current.addLayer({
      id: "route-glow",
      type: "line",
      source: "route-glow",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#00FF00", "line-width": 8, "line-opacity": 0.3, "line-blur": 4 },
    });

    // Progress layer - bright green traveled path
    map.current.addSource("route-progress", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.current.addLayer({
      id: "route-progress",
      type: "line",
      source: "route-progress",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#00FF00", "line-width": 3, "line-opacity": 1 },
    });
  }, [mapLoaded, dataPoints, colorMode, hasHeartRate]);

  // Update progress
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const progressSource = map.current.getSource("route-progress") as mapboxgl.GeoJSONSource;
    const glowSource = map.current.getSource("route-glow") as mapboxgl.GeoJSONSource;

    if (!progressSource || !glowSource) return;

    const progressCoordinates = dataPoints.slice(0, currentIndex + 1).map(p => [p.lon, p.lat]);

    const progressData = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: progressCoordinates,
      },
    };

    progressSource.setData(progressData);
    glowSource.setData(progressData);
  }, [currentIndex, mapLoaded, dataPoints]);

  // Update marker and camera
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentPoint = dataPoints[currentIndex];
    if (!currentPoint) return;

    if (!marker.current) {
      // Terminal-style marker - pulsing green dot
      const el = document.createElement("div");
      el.className = "terminal-marker";
      el.innerHTML = `
        <div class="terminal-marker-outer"></div>
        <div class="terminal-marker-inner"></div>
      `;
      el.style.cssText = `
        width: 20px;
        height: 20px;
        position: relative;
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
    if (now - lastCameraUpdate.current < 200) return;
    lastCameraUpdate.current = now;

    // Pan for follow mode
    map.current.panTo([currentPoint.lon, currentPoint.lat], {
      duration: 300,
      easing: (t) => t * (2 - t),
    });
  }, [currentIndex, mapLoaded, dataPoints, cameraMode]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Green tint overlay for matrix effect */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: "radial-gradient(ellipse at center, transparent 0%, rgba(0, 20, 0, 0.3) 100%)",
          mixBlendMode: "multiply",
        }}
      />

      {/* Scan lines overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10 terminal-scanlines"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px)",
        }}
      />

      <div ref={mapContainer} className="w-full h-full" style={{ filter: "saturate(0.3) brightness(0.8)" }} />

      {/* Marker styles */}
      <style>{`
        .terminal-marker-outer {
          position: absolute;
          inset: 0;
          background: rgba(0, 255, 0, 0.3);
          border-radius: 50%;
          animation: terminal-pulse 1.5s ease-in-out infinite;
        }
        .terminal-marker-inner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background: #00FF00;
          border-radius: 50%;
          box-shadow: 0 0 10px #00FF00, 0 0 20px #00FF00;
        }
        @keyframes terminal-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
});
