/**
 * Polaroid Map - Vintage-styled Mapbox GL map for Polaroid player
 *
 * Design: Warm sepia tones, vintage photo aesthetic
 * Features: Warm color overlay, vintage-style markers
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ActivityDataPoint } from "@/lib/activity-data-parser";
import { getGradientColor } from "@/lib/activity-data-parser";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

export type ColorMode = "speed" | "hr" | "elevation";
export type CameraMode = "follow" | "overview";

export interface PolaroidMapRef {
  flyToSegment: (startIndex: number, endIndex: number) => void;
}

interface PolaroidMapProps {
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

export const PolaroidMap = forwardRef<PolaroidMapRef, PolaroidMapProps>(function PolaroidMap({
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
  const [styleReady, setStyleReady] = useState(false);
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
      ], { padding: 80, maxZoom: 16, duration: 1000 });
    }
  }));

  // Initialize map with outdoors style for a more vintage look
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
      pitch: 30,
      bearing: 0,
    });

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

  // Add 3D terrain for depth
  useEffect(() => {
    if (!map.current || !mapLoaded || !styleReady) return;

    if (!map.current.getSource("mapbox-dem")) {
      map.current.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
    }

    map.current.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
  }, [mapLoaded, styleReady]);

  // Add route layers with vintage-style colors
  useEffect(() => {
    if (!map.current || !mapLoaded || !styleReady || dataPoints.length < 2) return;

    // Remove existing layers
    ["route-progress", "route-segments", "route-base"].forEach((layer) => {
      if (map.current?.getLayer(layer)) map.current.removeLayer(layer);
    });
    ["route-progress", "route-segments", "route-base"].forEach((source) => {
      if (map.current?.getSource(source)) map.current.removeSource(source);
    });

    const allCoordinates = dataPoints.map((p) => [p.lon, p.lat]);

    // Base route - vintage brown
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
      paint: { "line-color": "#8B7355", "line-width": 5, "line-opacity": 0.25 },
    });

    // Calculate color values with vintage palette
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
      paint: { "line-color": ["get", "color"], "line-width": 5, "line-opacity": 0.85 },
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

    // Vintage-style marker - pushpin look
    if (!marker.current) {
      const el = document.createElement("div");
      el.innerHTML = `
        <div style="
          width: 24px;
          height: 24px;
          position: relative;
        ">
          <div style="
            width: 16px;
            height: 16px;
            background: #C41E3A;
            border: 2px solid #8B0000;
            border-radius: 50%;
            position: absolute;
            top: 0;
            left: 4px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.3);
          "></div>
          <div style="
            width: 3px;
            height: 8px;
            background: linear-gradient(to bottom, #666 0%, #333 100%);
            position: absolute;
            bottom: 0;
            left: 10px;
            border-radius: 0 0 1px 1px;
          "></div>
        </div>
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

    // Follow mode
    map.current.panTo([currentPoint.lon, currentPoint.lat], {
      duration: 250,
      easing: (t) => t,
    });
  }, [currentIndex, mapLoaded, dataPoints, cameraMode]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Sepia/warm overlay for vintage look */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(139, 115, 85, 0.08) 0%, rgba(180, 140, 100, 0.12) 100%)",
          mixBlendMode: "multiply",
        }}
      />

      {/* Vignette effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: "inset 0 0 60px rgba(0,0,0,0.2)",
        }}
      />
    </div>
  );
});
