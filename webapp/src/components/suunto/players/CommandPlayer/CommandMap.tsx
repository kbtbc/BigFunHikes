/**
 * Command Map - Military Tactical Operations Center Map
 *
 * Full 3D terrain with satellite imagery for tactical reconnaissance feel.
 * Grid overlay, coordinate display, and military-style markers.
 *
 * Color Palette: Military olive (#556b2f), Warning amber (#ffa500), Alert red (#ff4444), Tactical gray (#2d2d2d)
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

export interface CommandMapRef {
  flyToSegment: (startIndex: number, endIndex: number) => void;
}

interface CommandMapProps {
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

// Military-style gradient colors (olive to amber to red)
function getMilitaryColor(
  value: number,
  min: number,
  max: number,
  mode: ColorMode
): string {
  if (value === undefined || value === null || isNaN(value)) {
    return "#556b2f";
  }

  let ratio = max === min ? 0.5 : (value - min) / (max - min);
  ratio = Math.max(0, Math.min(1, ratio));

  // Olive green -> amber -> alert red
  if (ratio < 0.5) {
    const t = ratio * 2;
    const r = Math.round(85 + (255 - 85) * t);
    const g = Math.round(107 + (165 - 107) * t);
    const b = Math.round(47 * (1 - t));
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = (ratio - 0.5) * 2;
    const r = Math.round(255);
    const g = Math.round(165 - (165 - 68) * t);
    const b = Math.round(68 * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export const CommandMap = forwardRef<CommandMapRef, CommandMapProps>(function CommandMap({
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
    ["route-highlight", "route-progress", "route-segments", "route-base", "route-glow"].forEach((layer) => {
      if (map.current?.getLayer(layer)) map.current.removeLayer(layer);
    });
    ["route-highlight", "route-progress", "route-segments", "route-base", "route-glow"].forEach((source) => {
      if (map.current?.getSource(source)) map.current.removeSource(source);
    });

    const allCoordinates = dataPoints.map((p) => [p.lon, p.lat]);

    // Base route - tactical olive wireframe
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
      paint: { "line-color": "#556b2f", "line-width": 5, "line-opacity": 0.3 },
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

    // Colored segments with military palette
    const features: GeoJSON.Feature[] = [];
    for (let i = 0; i < dataPoints.length - 1; i++) {
      const p1 = dataPoints[i];
      const p2 = dataPoints[i + 1];

      let value = 0;
      if (colorMode === "speed") value = p1.speed ?? 0;
      else if (colorMode === "hr" && hasHeartRate) value = p1.hr ?? 0;
      else value = p1.elevation ?? 0;

      const color = getMilitaryColor(value, minVal, maxVal, colorMode);

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
      paint: { "line-color": ["get", "color"], "line-width": 4, "line-opacity": 0.6 },
    });

    // Progress glow layer
    map.current.addSource("route-glow", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.current.addLayer({
      id: "route-glow",
      type: "line",
      source: "route-glow",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#ffa500", "line-width": 10, "line-opacity": 0.4, "line-blur": 4 },
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
    if (!map.current || !mapLoaded) return;

    const progressSource = map.current.getSource("route-progress") as mapboxgl.GeoJSONSource;
    const glowSource = map.current.getSource("route-glow") as mapboxgl.GeoJSONSource;

    if (!progressSource) return;

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

      const color = getMilitaryColor(value, minVal, maxVal, colorMode);

      progressFeatures.push({
        type: "Feature",
        properties: { color },
        geometry: { type: "LineString", coordinates: [[p1.lon, p1.lat], [p2.lon, p2.lat]] },
      });
    }

    progressSource.setData({
      type: "FeatureCollection",
      features: progressFeatures,
    });

    // Update glow layer
    if (glowSource) {
      const progressCoordinates = dataPoints.slice(0, currentIndex + 1).map(p => [p.lon, p.lat]);
      glowSource.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: progressCoordinates,
        },
      });
    }
  }, [currentIndex, mapLoaded, dataPoints, colorMode, hasHeartRate]);

  // Update marker and camera
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentPoint = dataPoints[currentIndex];
    if (!currentPoint) return;

    if (!marker.current) {
      // Tactical marker - military style crosshair
      const el = document.createElement("div");
      el.className = "command-marker";
      el.innerHTML = `
        <div class="command-marker-pulse"></div>
        <div class="command-marker-crosshair"></div>
        <div class="command-marker-center"></div>
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
      map.current.panTo([currentPoint.lon, currentPoint.lat], {
        duration: 200,
        easing: (t) => t,
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
          zoom: 16,
          duration: 200,
          easing: (t) => t,
        });
      }
    }
  }, [currentIndex, mapLoaded, dataPoints, cameraMode]);

  const currentPoint = dataPoints[currentIndex];

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Grid overlay effect */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(85, 107, 47, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(85, 107, 47, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Vignette effect */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.4) 100%)",
        }}
      />

      {/* Radar sweep animation overlay */}
      <div className="command-radar-sweep absolute inset-0 pointer-events-none z-10" />

      {/* Tactical info overlay - top left */}
      <div className="absolute top-3 left-3 z-20">
        <div className="command-info-panel">
          <div className="command-info-header">TACTICAL OPS CENTER</div>
          <div className="command-info-row">
            <span className="command-label">GRID REF</span>
            <span className="command-value">
              {currentPoint ? `${currentPoint.lat.toFixed(5)}N ${Math.abs(currentPoint.lon).toFixed(5)}${currentPoint.lon < 0 ? "W" : "E"}` : "--"}
            </span>
          </div>
          {temperature !== undefined && (
            <div className="command-info-row">
              <span className="command-label">TEMP</span>
              <span className="command-value command-amber">{temperature}F</span>
            </div>
          )}
        </div>
      </div>

      {/* Compass/bearing indicator - top right */}
      <div className="absolute top-3 right-16 z-20">
        <div className="command-compass">
          <div className="command-compass-inner">N</div>
        </div>
      </div>

      {/* Marker and animation styles */}
      <style>{`
        .command-marker {
          width: 40px;
          height: 40px;
          position: relative;
        }
        .command-marker-pulse {
          position: absolute;
          inset: 0;
          border: 2px solid #ffa500;
          border-radius: 50%;
          animation: command-pulse 2s ease-out infinite;
        }
        .command-marker-crosshair {
          position: absolute;
          inset: 8px;
          border: 2px solid #ffa500;
          border-radius: 50%;
        }
        .command-marker-crosshair::before,
        .command-marker-crosshair::after {
          content: '';
          position: absolute;
          background: #ffa500;
        }
        .command-marker-crosshair::before {
          top: 50%;
          left: -4px;
          right: -4px;
          height: 2px;
          transform: translateY(-50%);
        }
        .command-marker-crosshair::after {
          left: 50%;
          top: -4px;
          bottom: -4px;
          width: 2px;
          transform: translateX(-50%);
        }
        .command-marker-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background: #ff4444;
          border-radius: 50%;
          box-shadow: 0 0 10px #ff4444;
        }
        @keyframes command-pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }

        .command-radar-sweep::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(85, 107, 47, 0.15) 30deg,
            transparent 60deg
          );
          transform-origin: center;
          animation: radar-sweep 4s linear infinite;
        }
        @keyframes radar-sweep {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        .command-info-panel {
          background: rgba(45, 45, 45, 0.9);
          border: 1px solid #556b2f;
          padding: 8px 12px;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          color: #c0c0c0;
          min-width: 180px;
        }
        .command-info-header {
          color: #ffa500;
          font-weight: bold;
          font-size: 10px;
          letter-spacing: 1px;
          border-bottom: 1px solid #556b2f;
          padding-bottom: 4px;
          margin-bottom: 6px;
        }
        .command-info-row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
        }
        .command-label {
          color: #808080;
          font-size: 9px;
        }
        .command-value {
          color: #00ff00;
          font-weight: bold;
        }
        .command-amber {
          color: #ffa500;
        }

        .command-compass {
          width: 36px;
          height: 36px;
          background: rgba(45, 45, 45, 0.9);
          border: 2px solid #556b2f;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .command-compass-inner {
          color: #ffa500;
          font-family: 'Courier New', monospace;
          font-weight: bold;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
});
