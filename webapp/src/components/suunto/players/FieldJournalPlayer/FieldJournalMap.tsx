/**
 * Field Journal Map - Hand-drawn trail map aesthetic
 *
 * Color scheme: Cream paper + Forest green trails + Brown accents
 * Outdoors map style with earthy color palette
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ActivityDataPoint } from "@/lib/activity-data-parser";
import { getGradientColor } from "@/lib/activity-data-parser";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

export type ColorMode = "speed" | "hr" | "elevation";
export type CameraMode = "follow" | "overview";

export interface FieldJournalMapRef {
  flyToSegment: (startIndex: number, endIndex: number) => void;
}

interface FieldJournalMapProps {
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

export const FieldJournalMap = forwardRef<FieldJournalMapRef, FieldJournalMapProps>(function FieldJournalMap({
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

  // Initialize map with outdoors style for naturalist feel
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
    });

    // Add navigation control styled minimally
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
        { padding: 40, maxZoom: 15 }
      );
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [bounds]);

  // Add route layers with earthy, hand-drawn feel
  useEffect(() => {
    if (!map.current || !mapLoaded || dataPoints.length < 2) return;

    // Remove existing layers
    ["route-progress", "route-progress-outline", "route-segments", "route-base", "route-base-outline"].forEach((layer) => {
      if (map.current?.getLayer(layer)) map.current.removeLayer(layer);
    });
    ["route-progress", "route-segments", "route-base"].forEach((source) => {
      if (map.current?.getSource(source)) map.current.removeSource(source);
    });

    const allCoordinates = dataPoints.map((p) => [p.lon, p.lat]);

    // Base route - dashed line like hand-drawn trail
    map.current.addSource("route-base", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: allCoordinates },
      },
    });

    // Outer stroke for base route
    map.current.addLayer({
      id: "route-base-outline",
      type: "line",
      source: "route-base",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#6b4423",
        "line-width": 6,
        "line-opacity": 0.2,
      },
    });

    // Base trail - dashed for "sketched" look
    map.current.addLayer({
      id: "route-base",
      type: "line",
      source: "route-base",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#a0845c",
        "line-width": 3,
        "line-opacity": 0.5,
        "line-dasharray": [2, 2],
      },
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

    // Colored segments with earthy tones
    const features: GeoJSON.Feature[] = [];
    for (let i = 0; i < dataPoints.length - 1; i++) {
      const p1 = dataPoints[i];
      const p2 = dataPoints[i + 1];

      let value = 0;
      if (colorMode === "speed") value = p1.speed ?? 0;
      else if (colorMode === "hr" && hasHeartRate) value = p1.hr ?? 0;
      else value = p1.elevation ?? 0;

      // Use earthy gradient colors
      const color = getEarthyGradientColor(
        value,
        minVal,
        maxVal,
        colorMode
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
      paint: { "line-color": ["get", "color"], "line-width": 3, "line-opacity": 0.3 },
    });

    // Progress layer - solid traveled path in forest green
    map.current.addSource("route-progress", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    // Progress outline
    map.current.addLayer({
      id: "route-progress-outline",
      type: "line",
      source: "route-progress",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#1a3a0a", "line-width": 6, "line-opacity": 0.4 },
    });

    // Progress main line
    map.current.addLayer({
      id: "route-progress",
      type: "line",
      source: "route-progress",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#2d5016", "line-width": 4, "line-opacity": 0.9 },
    });
  }, [mapLoaded, dataPoints, colorMode, hasHeartRate]);

  // Update progress
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
      // Create a naturalist-style marker (like a pin on a map)
      const el = document.createElement("div");
      el.innerHTML = `
        <svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="12" cy="30" rx="4" ry="2" fill="rgba(0,0,0,0.2)"/>
          <path d="M12 0C5.4 0 0 5.4 0 12C0 21 12 28 12 28C12 28 24 21 24 12C24 5.4 18.6 0 12 0Z" fill="#2d5016" stroke="#1a3a0a" stroke-width="1"/>
          <circle cx="12" cy="11" r="5" fill="#faf6ed" stroke="#6b4423" stroke-width="1"/>
          <circle cx="12" cy="11" r="2" fill="#722f37"/>
        </svg>
      `;
      el.style.cssText = `
        width: 24px;
        height: 32px;
        cursor: pointer;
        transform: translate(-50%, -100%);
      `;

      marker.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
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

    // Gentle pan for follow mode
    map.current.panTo([currentPoint.lon, currentPoint.lat], {
      duration: 300,
      easing: (t) => t * (2 - t), // Ease out quad
    });
  }, [currentIndex, mapLoaded, dataPoints, cameraMode]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {/* Aged paper overlay effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at center, transparent 0%, rgba(107, 68, 35, 0.05) 100%),
            linear-gradient(180deg, rgba(250, 246, 237, 0.1) 0%, transparent 20%, transparent 80%, rgba(250, 246, 237, 0.15) 100%)
          `,
          mixBlendMode: 'multiply'
        }}
      />
    </div>
  );
});

// Custom earthy gradient colors for the field journal aesthetic
function getEarthyGradientColor(
  value: number,
  min: number,
  max: number,
  mode: ColorMode
): string {
  const normalized = max > min ? (value - min) / (max - min) : 0.5;

  if (mode === "hr") {
    // Heart rate: brown to burgundy
    const colors = [
      { r: 139, g: 90, b: 43 },   // Light brown
      { r: 165, g: 80, b: 40 },   // Warm brown
      { r: 139, g: 47, b: 47 },   // Reddish brown
      { r: 114, g: 47, b: 55 },   // Burgundy
    ];
    return interpolateColors(colors, normalized);
  } else if (mode === "elevation") {
    // Elevation: forest greens to brown peaks
    const colors = [
      { r: 45, g: 80, b: 22 },    // Forest green
      { r: 85, g: 107, b: 47 },   // Olive green
      { r: 139, g: 119, b: 79 },  // Tan
      { r: 107, g: 68, b: 35 },   // Brown (peaks)
    ];
    return interpolateColors(colors, normalized);
  } else {
    // Speed: sage to forest green
    const colors = [
      { r: 143, g: 151, b: 121 }, // Sage
      { r: 85, g: 107, b: 47 },   // Olive
      { r: 45, g: 80, b: 22 },    // Forest green
      { r: 30, g: 58, b: 12 },    // Dark forest
    ];
    return interpolateColors(colors, normalized);
  }
}

function interpolateColors(
  colors: { r: number; g: number; b: number }[],
  t: number
): string {
  const segments = colors.length - 1;
  const segment = Math.min(Math.floor(t * segments), segments - 1);
  const localT = (t * segments) - segment;

  const c1 = colors[segment];
  const c2 = colors[segment + 1];

  const r = Math.round(c1.r + (c2.r - c1.r) * localT);
  const g = Math.round(c1.g + (c2.g - c1.g) * localT);
  const b = Math.round(c1.b + (c2.b - c1.b) * localT);

  return `rgb(${r}, ${g}, ${b})`;
}
