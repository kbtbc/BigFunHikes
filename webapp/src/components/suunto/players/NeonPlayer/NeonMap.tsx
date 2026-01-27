/**
 * Neon Map - Mapbox GL map for Neon player style
 *
 * Cyberpunk aesthetic with neon glow effects
 * Color scheme: Deep purple/black (#0a0014) + Neon pink (#FF00FF) + Cyan (#00FFFF) + Electric blue (#0066FF)
 */

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ActivityDataPoint } from "@/lib/activity-data-parser";
import { getGradientColor } from "@/lib/activity-data-parser";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

export type ColorMode = "speed" | "hr" | "elevation";
export type CameraMode = "follow" | "overview" | "firstPerson";

export interface NeonMapRef {
  flyToSegment: (startIndex: number, endIndex: number) => void;
}

interface NeonMapProps {
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
  terrain3D: boolean;
  hasHeartRate: boolean;
  temperature?: number;
  highlightedSegment?: { start: number; end: number } | null;
}

// Neon color gradient generator
function getNeonGradientColor(
  value: number,
  min: number,
  max: number,
  mode: "speed" | "hr" | "elevation"
): string {
  let ratio = max === min ? 0.5 : (value - min) / (max - min);
  ratio = Math.max(0, Math.min(1, ratio));

  // Neon color scales - more vibrant cyberpunk colors
  const scales = {
    speed: [
      { r: 0, g: 255, b: 255 },    // Cyan (slow)
      { r: 0, g: 200, b: 255 },    // Electric blue
      { r: 200, g: 0, b: 255 },    // Purple
      { r: 255, g: 0, b: 255 },    // Magenta (fast)
    ],
    hr: [
      { r: 0, g: 255, b: 200 },    // Teal (low)
      { r: 0, g: 255, b: 100 },    // Neon green
      { r: 255, g: 100, b: 0 },    // Orange
      { r: 255, g: 0, b: 100 },    // Hot pink (high)
    ],
    elevation: [
      { r: 0, g: 100, b: 255 },    // Deep blue (low)
      { r: 100, g: 0, b: 255 },    // Purple
      { r: 255, g: 0, b: 255 },    // Magenta
      { r: 255, g: 255, b: 255 },  // White (high)
    ],
  };

  const scale = scales[mode];
  const segment = ratio * (scale.length - 1);
  const index = Math.floor(segment);
  const segmentRatio = segment - index;

  const c1 = scale[Math.min(index, scale.length - 1)];
  const c2 = scale[Math.min(index + 1, scale.length - 1)];

  const r = Math.round(c1.r + (c2.r - c1.r) * segmentRatio);
  const g = Math.round(c1.g + (c2.g - c1.g) * segmentRatio);
  const b = Math.round(c1.b + (c2.b - c1.b) * segmentRatio);

  return `rgb(${r}, ${g}, ${b})`;
}

export const NeonMap = forwardRef<NeonMapRef, NeonMapProps>(function NeonMap({
  dataPoints,
  currentIndex,
  bounds,
  colorMode,
  cameraMode,
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
      pitch: 60,
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

  // Add 3D terrain
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

      map.current.setTerrain({ source: "mapbox-dem", exaggeration: 2.5 });

      if (!map.current.getLayer("sky")) {
        map.current.addLayer({
          id: "sky",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [0.0, 0.0],
            "sky-atmosphere-sun-intensity": 5,
            "sky-atmosphere-color": "rgba(10, 0, 20, 1)",
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

  // Add route layers with neon glow
  useEffect(() => {
    if (!map.current || !mapLoaded || !styleReady || dataPoints.length < 2) return;

    // Remove existing layers
    ["route-highlight", "route-progress-glow", "route-progress", "route-segments-glow", "route-segments", "route-base-glow", "route-base"].forEach((layer) => {
      if (map.current?.getLayer(layer)) map.current.removeLayer(layer);
    });
    ["route-highlight", "route-progress", "route-segments", "route-base"].forEach((source) => {
      if (map.current?.getSource(source)) map.current.removeSource(source);
    });

    const allCoordinates = dataPoints.map((p) => [p.lon, p.lat]);

    // Base route with neon glow effect
    map.current.addSource("route-base", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: allCoordinates },
      },
    });

    // Outer glow layer
    map.current.addLayer({
      id: "route-base-glow",
      type: "line",
      source: "route-base",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#FF00FF", "line-width": 12, "line-opacity": 0.15, "line-blur": 8 },
    });

    // Base route
    map.current.addLayer({
      id: "route-base",
      type: "line",
      source: "route-base",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#330033", "line-width": 4, "line-opacity": 0.5 },
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

    // Colored segments with neon colors
    const features: GeoJSON.Feature[] = [];
    for (let i = 0; i < dataPoints.length - 1; i++) {
      const p1 = dataPoints[i];
      const p2 = dataPoints[i + 1];

      let value = 0;
      if (colorMode === "speed") value = p1.speed ?? 0;
      else if (colorMode === "hr" && hasHeartRate) value = p1.hr ?? 0;
      else value = p1.elevation ?? 0;

      const color = getNeonGradientColor(
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

    // Segments glow
    map.current.addLayer({
      id: "route-segments-glow",
      type: "line",
      source: "route-segments",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": ["get", "color"], "line-width": 10, "line-opacity": 0.2, "line-blur": 6 },
    });

    map.current.addLayer({
      id: "route-segments",
      type: "line",
      source: "route-segments",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": ["get", "color"], "line-width": 3, "line-opacity": 0.4 },
    });

    // Progress layer
    map.current.addSource("route-progress", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    // Progress glow
    map.current.addLayer({
      id: "route-progress-glow",
      type: "line",
      source: "route-progress",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": ["get", "color"], "line-width": 14, "line-opacity": 0.4, "line-blur": 8 },
    });

    map.current.addLayer({
      id: "route-progress",
      type: "line",
      source: "route-progress",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": ["get", "color"], "line-width": 5, "line-opacity": 1 },
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

      const color = getNeonGradientColor(
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

    // Create neon-styled marker
    if (!marker.current) {
      const el = document.createElement("div");
      el.className = "neon-marker";
      el.innerHTML = `
        <div class="neon-marker-outer"></div>
        <div class="neon-marker-inner"></div>
        <div class="neon-marker-core"></div>
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
      map.current.panTo([currentPoint.lon, currentPoint.lat], {
        duration: 200,
        easing: (t) => t,
      });
    } else if (cameraMode === "firstPerson") {
      const nextIndex = Math.min(currentIndex + 5, dataPoints.length - 1);
      const nextPoint = dataPoints[nextIndex];

      if (nextPoint && (nextPoint.lat !== currentPoint.lat || nextPoint.lon !== currentPoint.lon)) {
        const dLon = (nextPoint.lon - currentPoint.lon) * Math.PI / 180;
        const lat1 = currentPoint.lat * Math.PI / 180;
        const lat2 = nextPoint.lat * Math.PI / 180;
        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        const targetBearing = Math.atan2(y, x) * 180 / Math.PI;

        const bearingDiff = targetBearing - lastBearing.current;
        const normalizedDiff = ((bearingDiff + 540) % 360) - 180;
        lastBearing.current = lastBearing.current + normalizedDiff * 0.08;

        map.current.easeTo({
          center: [currentPoint.lon, currentPoint.lat],
          bearing: lastBearing.current,
          pitch: 70,
          zoom: 16,
          duration: 200,
          easing: (t) => t,
        });
      }
    }
  }, [currentIndex, mapLoaded, dataPoints, cameraMode]);

  return (
    <div className="relative w-full h-full neon-map-container">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Neon border effect */}
      <div className="absolute inset-0 pointer-events-none neon-border" />

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none scanlines" />

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-16 h-16 neon-corner neon-corner-tl" />
      <div className="absolute top-0 right-0 w-16 h-16 neon-corner neon-corner-tr" />
      <div className="absolute bottom-0 left-0 w-16 h-16 neon-corner neon-corner-bl" />
      <div className="absolute bottom-0 right-0 w-16 h-16 neon-corner neon-corner-br" />

      {/* HUD Info overlay */}
      <div className="absolute top-4 left-4 neon-hud-panel">
        <div className="flex items-center gap-2">
          <div className="neon-status-dot" />
          <span className="neon-hud-text text-xs tracking-widest">SYSTEM ONLINE</span>
        </div>
        {temperature !== undefined && (
          <div className="mt-2 flex items-center gap-2">
            <span className="neon-hud-label">TEMP:</span>
            <span className="neon-hud-value">{temperature}F</span>
          </div>
        )}
      </div>

      {/* Neon Map Styles */}
      <style>{`
        .neon-map-container {
          background: #0a0014;
        }

        /* Neon border */
        .neon-border {
          border: 2px solid transparent;
          border-image: linear-gradient(135deg, #FF00FF, #00FFFF, #FF00FF) 1;
          box-shadow:
            inset 0 0 20px rgba(255, 0, 255, 0.3),
            inset 0 0 40px rgba(0, 255, 255, 0.2);
        }

        /* Corner decorations */
        .neon-corner {
          border: 2px solid #00FFFF;
        }
        .neon-corner-tl {
          border-right: none;
          border-bottom: none;
          box-shadow: -4px -4px 10px rgba(0, 255, 255, 0.5);
        }
        .neon-corner-tr {
          border-left: none;
          border-bottom: none;
          box-shadow: 4px -4px 10px rgba(0, 255, 255, 0.5);
        }
        .neon-corner-bl {
          border-right: none;
          border-top: none;
          box-shadow: -4px 4px 10px rgba(0, 255, 255, 0.5);
        }
        .neon-corner-br {
          border-left: none;
          border-top: none;
          box-shadow: 4px 4px 10px rgba(0, 255, 255, 0.5);
        }

        /* Scanline effect */
        .scanlines {
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 255, 255, 0.03) 2px,
            rgba(0, 255, 255, 0.03) 4px
          );
          animation: scanline-flicker 0.1s infinite;
        }

        @keyframes scanline-flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.98; }
        }

        /* HUD Panel */
        .neon-hud-panel {
          background: rgba(10, 0, 20, 0.85);
          border: 1px solid rgba(0, 255, 255, 0.5);
          border-radius: 4px;
          padding: 8px 12px;
          backdrop-filter: blur(8px);
          box-shadow:
            0 0 10px rgba(0, 255, 255, 0.3),
            inset 0 0 20px rgba(0, 255, 255, 0.1);
        }

        .neon-hud-text {
          color: #00FFFF;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
          font-family: 'Orbitron', 'Share Tech Mono', monospace;
        }

        .neon-hud-label {
          color: rgba(255, 0, 255, 0.7);
          font-size: 10px;
          font-family: 'Orbitron', 'Share Tech Mono', monospace;
        }

        .neon-hud-value {
          color: #FF00FF;
          font-size: 14px;
          font-weight: bold;
          text-shadow: 0 0 10px rgba(255, 0, 255, 0.8);
          font-family: 'Orbitron', 'Share Tech Mono', monospace;
        }

        .neon-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00FF00;
          box-shadow: 0 0 10px #00FF00;
          animation: pulse-glow 1.5s infinite;
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 5px #00FF00, 0 0 10px #00FF00;
            opacity: 1;
          }
          50% {
            box-shadow: 0 0 15px #00FF00, 0 0 25px #00FF00;
            opacity: 0.8;
          }
        }

        /* Neon marker */
        .neon-marker {
          position: relative;
          width: 30px;
          height: 30px;
        }

        .neon-marker-outer {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 0, 255, 0.4) 0%, transparent 70%);
          animation: marker-pulse 1.5s ease-in-out infinite;
        }

        .neon-marker-inner {
          position: absolute;
          top: 5px;
          left: 5px;
          right: 5px;
          bottom: 5px;
          border-radius: 50%;
          border: 2px solid #FF00FF;
          box-shadow:
            0 0 10px #FF00FF,
            0 0 20px #FF00FF,
            inset 0 0 10px rgba(255, 0, 255, 0.5);
        }

        .neon-marker-core {
          position: absolute;
          top: 10px;
          left: 10px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #00FFFF;
          box-shadow: 0 0 10px #00FFFF, 0 0 20px #00FFFF;
        }

        @keyframes marker-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
});
