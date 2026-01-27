/**
 * Editorial Map - Elegant sidebar/background map for magazine layout
 *
 * Color scheme: Off-white (#FAFAFA) + Rich black (#1A1A1A) + Deep red accent (#C41E3A)
 * Artistic, secondary element - clean outdoors style with minimal controls
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ActivityDataPoint } from "@/lib/activity-data-parser";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

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
}

export const EditorialMap = forwardRef<EditorialMapRef, EditorialMapProps>(function EditorialMap({
  dataPoints,
  currentIndex,
  bounds,
  cameraMode,
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

  // Initialize map with light, elegant style
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [
        (bounds.east + bounds.west) / 2,
        (bounds.north + bounds.south) / 2,
      ],
      zoom: 13,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    // Minimal control - just zoom
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

  // Add route layers - elegant, single-color aesthetic
  useEffect(() => {
    if (!map.current || !mapLoaded || dataPoints.length < 2) return;

    // Remove existing layers
    ["route-progress", "route-base", "route-glow"].forEach((layer) => {
      if (map.current?.getLayer(layer)) map.current.removeLayer(layer);
    });
    ["route-progress", "route-base", "route-glow"].forEach((source) => {
      if (map.current?.getSource(source)) map.current.removeSource(source);
    });

    const allCoordinates = dataPoints.map((p) => [p.lon, p.lat]);

    // Base route - subtle, elegant gray
    map.current.addSource("route-base", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: allCoordinates },
      },
    });

    // Subtle glow effect
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
      paint: { "line-color": "#1A1A1A", "line-width": 6, "line-opacity": 0.08 },
    });

    map.current.addLayer({
      id: "route-base",
      type: "line",
      source: "route-base",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#9CA3AF", "line-width": 2, "line-opacity": 0.6 },
    });

    // Progress layer - deep red accent color
    map.current.addSource("route-progress", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.current.addLayer({
      id: "route-progress",
      type: "line",
      source: "route-progress",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#C41E3A", "line-width": 3, "line-opacity": 1 },
    });
  }, [mapLoaded, dataPoints]);

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
        background: #C41E3A;
        border: 2px solid #FAFAFA;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(196, 30, 58, 0.4);
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
      easing: (t) => t * (2 - t),
    });
  }, [currentIndex, mapLoaded, dataPoints, cameraMode]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />
      {/* Subtle vignette overlay for editorial feel */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(250, 250, 250, 0.3) 100%)"
        }}
      />
    </div>
  );
});
