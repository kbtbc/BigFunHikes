/**
 * Blueprint Map - Technical Drawing / CAD Style Map
 *
 * Color scheme: Navy blue (#1e3a5f) + Cyan (#22d3ee) lines
 * Clean vector-style rendering with technical annotations
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ActivityDataPoint } from "@/lib/activity-data-parser";
import { getGradientColor } from "@/lib/activity-data-parser";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

export type ColorMode = "speed" | "hr" | "elevation";
export type CameraMode = "follow" | "overview";

export interface BlueprintMapRef {
  flyToSegment: (startIndex: number, endIndex: number) => void;
}

interface BlueprintMapProps {
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

export const BlueprintMap = forwardRef<BlueprintMapRef, BlueprintMapProps>(function BlueprintMap({
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

  // Initialize map with dark/navigation-night style for blueprint look
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/navigation-night-v1",
      center: [
        (bounds.east + bounds.west) / 2,
        (bounds.north + bounds.south) / 2,
      ],
      zoom: 13,
      pitch: 0,
      bearing: 0,
    });

    // Navigation control with blueprint styling
    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    map.current.on("load", () => {
      setMapLoaded(true);

      // Apply blueprint color scheme to map layers
      if (map.current) {
        // Adjust background to navy blue
        try {
          map.current.setPaintProperty("background", "background-color", "#1e3a5f");
        } catch (e) {
          // Layer might not exist
        }

        // Make water darker
        try {
          map.current.setPaintProperty("water", "fill-color", "#152d4a");
        } catch (e) {
          // Layer might not exist
        }

        // Make roads cyan-tinted
        const roadLayers = ["road-primary", "road-secondary", "road-street", "road-minor"];
        roadLayers.forEach(layer => {
          try {
            map.current?.setPaintProperty(layer, "line-color", "rgba(34, 211, 238, 0.3)");
          } catch (e) {
            // Layer might not exist
          }
        });
      }

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

    // Glow effect layer - cyan halo
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
      paint: {
        "line-color": "#22d3ee",
        "line-width": 8,
        "line-opacity": 0.15,
        "line-blur": 4,
      },
    });

    // Base route - dashed line like technical drawing
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
      paint: {
        "line-color": "rgba(34, 211, 238, 0.3)",
        "line-width": 2,
        "line-dasharray": [2, 4],
      },
    });

    // Calculate color values for segments
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

    // Colored segments - using cyan-to-white gradient for blueprint feel
    const features: GeoJSON.Feature[] = [];
    for (let i = 0; i < dataPoints.length - 1; i++) {
      const p1 = dataPoints[i];
      const p2 = dataPoints[i + 1];

      let value = 0;
      if (colorMode === "speed") value = p1.speed ?? 0;
      else if (colorMode === "hr" && hasHeartRate) value = p1.hr ?? 0;
      else value = p1.elevation ?? 0;

      // Custom blueprint color gradient - cyan to white
      const ratio = maxVal === minVal ? 0.5 : (value - minVal) / (maxVal - minVal);
      const r = Math.round(34 + (255 - 34) * ratio);
      const g = Math.round(211 + (255 - 211) * ratio);
      const b = Math.round(238 + (255 - 238) * ratio);
      const color = `rgb(${r}, ${g}, ${b})`;

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

    // Progress layer - solid cyan line for traveled path
    map.current.addSource("route-progress", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.current.addLayer({
      id: "route-progress",
      type: "line",
      source: "route-progress",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": "#22d3ee", "line-width": 3, "line-opacity": 1 },
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
      // Technical crosshair marker design
      const el = document.createElement("div");
      el.style.cssText = `
        width: 20px;
        height: 20px;
        position: relative;
      `;
      el.innerHTML = `
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background: #22d3ee;
          border: 2px solid #1e3a5f;
          border-radius: 50%;
        "></div>
        <div style="
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 1px;
          height: 6px;
          background: #22d3ee;
        "></div>
        <div style="
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 1px;
          height: 6px;
          background: #22d3ee;
        "></div>
        <div style="
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 1px;
          background: #22d3ee;
        "></div>
        <div style="
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 1px;
          background: #22d3ee;
        "></div>
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

    // Gentle pan for follow mode
    map.current.panTo([currentPoint.lon, currentPoint.lat], {
      duration: 300,
      easing: (t) => t * (2 - t), // Ease out quad
    });
  }, [currentIndex, mapLoaded, dataPoints, cameraMode]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Grid overlay for blueprint effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(34, 211, 238, 0.05) 39px, rgba(34, 211, 238, 0.05) 40px),
            repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(34, 211, 238, 0.05) 39px, rgba(34, 211, 238, 0.05) 40px)
          `,
        }}
      />
    </div>
  );
});
