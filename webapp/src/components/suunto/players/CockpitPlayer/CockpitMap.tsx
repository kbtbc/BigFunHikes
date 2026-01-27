/**
 * Cockpit Map - Aviation Navigation Display Style
 *
 * Color scheme: Dark base (#1a1a1a) + Amber (#f59e0b) + Cyan accents (#06b6d4)
 * Dark map style with HUD-style overlays
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ActivityDataPoint } from "@/lib/activity-data-parser";
import { getGradientColor } from "@/lib/activity-data-parser";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

export type ColorMode = "speed" | "hr" | "elevation";
export type CameraMode = "follow" | "overview";

export interface CockpitMapRef {
  flyToSegment: (startIndex: number, endIndex: number) => void;
}

interface CockpitMapProps {
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

export const CockpitMap = forwardRef<CockpitMapRef, CockpitMapProps>(function CockpitMap({
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

  // Initialize map with dark navigation style
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/navigation-night-v1",
      center: [
        (bounds.east + bounds.west) / 2,
        (bounds.north + bounds.south) / 2,
      ],
      zoom: 14,
      pitch: 45,
      bearing: 0,
    });

    // Minimal navigation control
    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: true }),
      "top-right"
    );

    map.current.on("load", () => {
      setMapLoaded(true);

      map.current?.fitBounds(
        [
          [bounds.west, bounds.south],
          [bounds.east, bounds.north],
        ],
        { padding: 50, maxZoom: 15, pitch: 45 }
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
    ["route-progress", "route-segments", "route-base", "waypoints"].forEach((layer) => {
      if (map.current?.getLayer(layer)) map.current.removeLayer(layer);
    });
    ["route-progress", "route-segments", "route-base", "waypoints"].forEach((source) => {
      if (map.current?.getSource(source)) map.current.removeSource(source);
    });

    const allCoordinates = dataPoints.map((p) => [p.lon, p.lat]);

    // Base route - dark gray outline
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
      paint: { "line-color": "#1a1a1a", "line-width": 8, "line-opacity": 0.8 },
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
      paint: { "line-color": ["get", "color"], "line-width": 4, "line-opacity": 0.4 },
    });

    // Progress layer - amber traveled path
    map.current.addSource("route-progress", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.current.addLayer({
      id: "route-progress",
      type: "line",
      source: "route-progress",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#f59e0b", "line-width": 5, "line-opacity": 0.9 },
    });

    // Waypoints - start and end markers
    const waypointFeatures: GeoJSON.Feature[] = [
      {
        type: "Feature",
        properties: { type: "start" },
        geometry: { type: "Point", coordinates: [dataPoints[0].lon, dataPoints[0].lat] },
      },
      {
        type: "Feature",
        properties: { type: "end" },
        geometry: { type: "Point", coordinates: [dataPoints[dataPoints.length - 1].lon, dataPoints[dataPoints.length - 1].lat] },
      },
    ];

    map.current.addSource("waypoints", {
      type: "geojson",
      data: { type: "FeatureCollection", features: waypointFeatures },
    });

    map.current.addLayer({
      id: "waypoints",
      type: "circle",
      source: "waypoints",
      paint: {
        "circle-radius": 6,
        "circle-color": ["match", ["get", "type"], "start", "#22c55e", "end", "#ef4444", "#f59e0b"],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#0d0d0d",
      },
    });
  }, [mapLoaded, dataPoints, colorMode, hasHeartRate]);

  // Update progress with amber glow effect
  useEffect(() => {
    if (!map.current || !mapLoaded || !map.current.getSource("route-progress")) return;

    const progressCoordinates = dataPoints.slice(0, currentIndex + 1).map(p => [p.lon, p.lat]);

    (map.current.getSource("route-progress") as mapboxgl.GeoJSONSource).setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: progressCoordinates,
      },
    });
  }, [currentIndex, mapLoaded, dataPoints]);

  // Update marker and camera - cockpit style marker
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentPoint = dataPoints[currentIndex];
    if (!currentPoint) return;

    // Calculate bearing for marker rotation
    let bearing = 0;
    if (currentIndex > 0) {
      const prev = dataPoints[currentIndex - 1];
      const dLon = (currentPoint.lon - prev.lon) * Math.PI / 180;
      const lat1 = prev.lat * Math.PI / 180;
      const lat2 = currentPoint.lat * Math.PI / 180;
      const y = Math.sin(dLon) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
      bearing = Math.atan2(y, x) * 180 / Math.PI;
    }

    if (!marker.current) {
      // Aircraft-style marker with directional indicator
      const el = document.createElement("div");
      el.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="#0d0d0d" stroke="#f59e0b" stroke-width="2"/>
          <circle cx="16" cy="16" r="8" fill="#f59e0b"/>
          <path d="M16 4 L18 12 L16 10 L14 12 Z" fill="#06b6d4"/>
        </svg>
      `;
      el.style.cssText = `
        width: 32px;
        height: 32px;
        filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.6));
        transition: transform 0.2s ease;
      `;

      marker.current = new mapboxgl.Marker({ element: el, rotationAlignment: "map" })
        .setLngLat([currentPoint.lon, currentPoint.lat])
        .setRotation(bearing)
        .addTo(map.current);
    } else {
      marker.current.setLngLat([currentPoint.lon, currentPoint.lat]);
      marker.current.setRotation(bearing);
    }

    // Skip camera updates in overview mode
    if (cameraMode === "overview") return;

    // Throttle camera updates
    const now = Date.now();
    if (now - lastCameraUpdate.current < 200) return;
    lastCameraUpdate.current = now;

    // Follow mode - smooth pan with slight pitch
    map.current.easeTo({
      center: [currentPoint.lon, currentPoint.lat],
      bearing: bearing,
      pitch: 50,
      zoom: 15.5,
      duration: 300,
      easing: (t) => 1 - Math.pow(1 - t, 3), // Ease out cubic
    });
  }, [currentIndex, mapLoaded, dataPoints, cameraMode]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />
      {/* Scan line overlay for CRT effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />
      {/* Vignette effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  );
});
