/**
 * Noir Map - Mapbox GL map for Noir player style
 *
 * Film noir aesthetic with high contrast black and white, dramatic shadows,
 * and blood red accent color for heart rate data.
 * Color scheme: Pure black (#000000), white (#ffffff), dark gray (#1a1a1a), blood red (#8b0000)
 */

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ActivityDataPoint } from "@/lib/activity-data-parser";
import { getGradientColor } from "@/lib/activity-data-parser";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

export type ColorMode = "speed" | "hr" | "elevation";
export type CameraMode = "follow" | "overview" | "firstPerson";
export type MapStyle = "dark" | "satellite";

export interface NoirMapRef {
  flyToSegment: (startIndex: number, endIndex: number) => void;
}

interface NoirMapProps {
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

// Noir-themed gradient colors (grayscale with blood red for HR)
function getNoirGradientColor(
  value: number,
  min: number,
  max: number,
  mode: "speed" | "hr" | "elevation"
): string {
  const normalized = max > min ? (value - min) / (max - min) : 0.5;

  if (mode === "hr") {
    // Blood red gradient for heart rate
    const intensity = Math.round(normalized * 139);
    return `rgb(${intensity + 80}, ${Math.round(normalized * 20)}, ${Math.round(normalized * 20)})`;
  }

  // Grayscale for speed and elevation
  const gray = Math.round(100 + normalized * 155);
  return `rgb(${gray}, ${gray}, ${gray})`;
}

export const NoirMap = forwardRef<NoirMapRef, NoirMapProps>(function NoirMap({
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
      style: "mapbox://styles/mapbox/dark-v11",
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

  // Add 3D terrain with moody atmosphere
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

      map.current.setTerrain({ source: "mapbox-dem", exaggeration: 2.0 });

      // Moody, dark sky atmosphere
      if (!map.current.getLayer("sky")) {
        map.current.addLayer({
          id: "sky",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [0.0, 10.0], // Low sun angle for dramatic shadows
            "sky-atmosphere-sun-intensity": 5, // Lower intensity for darker mood
          },
        });
      }

      // Add fog for atmospheric depth
      map.current.setFog({
        color: "#1a1a1a",
        "high-color": "#0a0a0a",
        "horizon-blend": 0.1,
        "space-color": "#000000",
        "star-intensity": 0.15,
      });
    } else {
      map.current.setTerrain(null);
      if (map.current.getLayer("sky")) {
        map.current.removeLayer("sky");
      }
      map.current.setFog(null);
    }
  }, [terrain3D, mapLoaded, styleReady]);

  // Handle map style changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const styleUrl = mapStyle === "satellite"
      ? "mapbox://styles/mapbox/satellite-streets-v12"
      : "mapbox://styles/mapbox/dark-v11";

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

    // Base route - dark gray
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
      paint: { "line-color": "#333333", "line-width": 5, "line-opacity": 0.4 },
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

    // Colored segments with noir gradient
    const features: GeoJSON.Feature[] = [];
    for (let i = 0; i < dataPoints.length - 1; i++) {
      const p1 = dataPoints[i];
      const p2 = dataPoints[i + 1];

      let value = 0;
      if (colorMode === "speed") value = p1.speed ?? 0;
      else if (colorMode === "hr" && hasHeartRate) value = p1.hr ?? 0;
      else value = p1.elevation ?? 0;

      const color = getNoirGradientColor(
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
      paint: { "line-color": ["get", "color"], "line-width": 4, "line-opacity": 0.7 },
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

      const color = getNoirGradientColor(
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

    if (!marker.current) {
      const el = document.createElement("div");
      el.style.cssText = `
        width: 18px;
        height: 18px;
        background: #ffffff;
        border: 3px solid #8b0000;
        border-radius: 50%;
        box-shadow: 0 0 20px rgba(139, 0, 0, 0.6), 0 2px 8px rgba(0,0,0,0.5);
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

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" style={{ filter: mapStyle === "dark" ? "grayscale(30%) contrast(1.1)" : "grayscale(60%) contrast(1.2)" }} />

      {/* Film grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />

      {/* Info overlay - film noir style */}
      <div className="absolute top-3 left-3 flex items-center gap-3 bg-black/80 backdrop-blur-sm rounded px-4 py-2 text-white shadow-lg border border-white/10">
        <span className="font-serif text-sm tracking-wider uppercase" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Replay Studio
        </span>
        {temperature !== undefined && (
          <>
            <span className="text-white/30">|</span>
            <span className="font-mono text-sm text-[#8b0000]">{temperature}F</span>
          </>
        )}
      </div>
    </div>
  );
});
