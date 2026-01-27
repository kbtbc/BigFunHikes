/**
 * Editorial Map - Elegant sidebar/background map for magazine layout
 *
 * Color scheme: Off-white (#faf8f5) + Deep red accent (#991b1b) + Warm grays
 * Artistic, secondary element - outdoors style with elegant, minimal aesthetic
 * Supports color modes for route visualization (speed, elevation, heart rate)
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ActivityDataPoint } from "@/lib/activity-data-parser";
import { getGradientColor } from "@/lib/activity-data-parser";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

export type ColorMode = "speed" | "hr" | "elevation";
export type CameraMode = "follow" | "overview";

export interface EditorialMapRef {
  flyToSegment: (startIndex: number, endIndex: number) => void;
  fitBounds: () => void;
}

interface EditorialMapProps {
  dataPoints: ActivityDataPoint[];
  currentIndex: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  cameraMode: CameraMode;
  colorMode: ColorMode;
  hasHeartRate: boolean;
}

export const EditorialMap = forwardRef<EditorialMapRef, EditorialMapProps>(function EditorialMap({
  dataPoints,
  currentIndex,
  bounds,
  cameraMode,
  colorMode,
  hasHeartRate,
}, ref) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const lastCameraUpdate = useRef<number>(0);

  // Expose methods
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
      ], { padding: 40, maxZoom: 16, duration: 800 });
    },
    fitBounds: () => {
      if (!map.current) return;
      map.current.fitBounds(
        [
          [bounds.west, bounds.south],
          [bounds.east, bounds.north],
        ],
        { padding: 30, maxZoom: 15, duration: 600 }
      );
    }
  }));

  // Initialize map with outdoors style for editorial feel
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
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    // Minimal control - just zoom, positioned elegantly
    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }),
      "bottom-right"
    );

    map.current.on("load", () => {
      setMapLoaded(true);

      map.current?.fitBounds(
        [
          [bounds.west, bounds.south],
          [bounds.east, bounds.north],
        ],
        { padding: 30, maxZoom: 15 }
      );
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [bounds]);

  // Add route layers with color mode support
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

    // Base route - subtle, elegant warm gray
    map.current.addSource("route-base", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: allCoordinates },
      },
    });

    // Subtle glow effect for depth
    map.current.addSource("route-glow", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: allCoordinates },
      },
    });

    map.current.addLayer({
      id: "route-glow",
      type: "line",
      source: "route-glow",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#4a4035", "line-width": 6, "line-opacity": 0.08 },
    });

    map.current.addLayer({
      id: "route-base",
      type: "line",
      source: "route-base",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#d4cfc7", "line-width": 3, "line-opacity": 0.5 },
    });

    // Calculate color values for gradient
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

    // Colored segments based on color mode
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
      paint: { "line-color": ["get", "color"], "line-width": 3, "line-opacity": 0.35 },
    });

    // Progress layer - deep red accent color for traveled path
    map.current.addSource("route-progress", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.current.addLayer({
      id: "route-progress",
      type: "line",
      source: "route-progress",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#991b1b", "line-width": 3.5, "line-opacity": 0.9 },
    });
  }, [mapLoaded, dataPoints, colorMode, hasHeartRate]);

  // Update progress line
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

  // Update marker and camera
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentPoint = dataPoints[currentIndex];
    if (!currentPoint) return;

    if (!marker.current) {
      // Elegant, minimal marker - deep red with subtle shadow
      const el = document.createElement("div");
      el.style.cssText = `
        width: 12px;
        height: 12px;
        background: #991b1b;
        border: 2px solid #faf8f5;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(153, 27, 27, 0.4);
        transition: transform 0.2s ease;
      `;

      marker.current = new mapboxgl.Marker({ element: el })
        .setLngLat([currentPoint.lon, currentPoint.lat])
        .addTo(map.current);
    } else {
      marker.current.setLngLat([currentPoint.lon, currentPoint.lat]);
    }

    // Skip camera updates in overview mode
    if (cameraMode === "overview") return;

    // Throttle camera updates for smooth animation
    const now = Date.now();
    if (now - lastCameraUpdate.current < 250) return;
    lastCameraUpdate.current = now;

    // Smooth pan for follow mode
    map.current.panTo([currentPoint.lon, currentPoint.lat], {
      duration: 350,
      easing: (t) => t * (2 - t), // Ease out quad
    });
  }, [currentIndex, mapLoaded, dataPoints, cameraMode]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />
      {/* Subtle vignette overlay for editorial/print feel */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 60%, rgba(250, 248, 245, 0.4) 100%)"
        }}
      />
    </div>
  );
});
