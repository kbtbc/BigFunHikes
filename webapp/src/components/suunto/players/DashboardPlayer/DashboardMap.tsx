/**
 * Dashboard Map - Compact Mapbox GL map for Dashboard player style
 *
 * Color scheme: Dark slate (#1e293b) + Cyan (#06b6d4) + Purple (#8b5cf6)
 * Designed for multi-panel dashboard layout
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ActivityDataPoint } from "@/lib/activity-data-parser";
import { getGradientColor } from "@/lib/activity-data-parser";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

export type ColorMode = "speed" | "hr" | "elevation";

export interface DashboardMapRef {
  flyToSegment: (startIndex: number, endIndex: number) => void;
}

interface DashboardMapProps {
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
  highlightedSegment?: { start: number; end: number } | null;
}

export const DashboardMap = forwardRef<DashboardMapRef, DashboardMapProps>(function DashboardMap({
  dataPoints,
  currentIndex,
  bounds,
  colorMode,
  hasHeartRate,
  highlightedSegment,
}, ref) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleReady, setStyleReady] = useState(false);

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
      ], { padding: 40, maxZoom: 16, duration: 1000 });
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
      pitch: 30,
      bearing: 0,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
      setStyleReady(true);

      // Add 3D terrain
      if (!map.current?.getSource("mapbox-dem")) {
        map.current?.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
      }

      map.current?.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

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

    // Base route (glow effect)
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
      paint: { "line-color": "#06b6d4", "line-width": 10, "line-opacity": 0.15, "line-blur": 8 },
    });

    // Base route
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
      paint: { "line-color": "#334155", "line-width": 4, "line-opacity": 0.5 },
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
      paint: { "line-color": ["get", "color"], "line-width": 3, "line-opacity": 0.4 },
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

  // Update marker
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentPoint = dataPoints[currentIndex];
    if (!currentPoint) return;

    if (!marker.current) {
      const el = document.createElement("div");
      el.className = "dashboard-marker";
      el.style.cssText = `
        width: 16px;
        height: 16px;
        background: #06b6d4;
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 0 12px rgba(6, 182, 212, 0.8), 0 0 24px rgba(6, 182, 212, 0.4);
      `;

      marker.current = new mapboxgl.Marker({ element: el })
        .setLngLat([currentPoint.lon, currentPoint.lat])
        .addTo(map.current);
    } else {
      marker.current.setLngLat([currentPoint.lon, currentPoint.lat]);
    }

    // Pan to marker
    map.current.panTo([currentPoint.lon, currentPoint.lat], {
      duration: 200,
      easing: (t) => t,
    });
  }, [currentIndex, mapLoaded, dataPoints]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
});
