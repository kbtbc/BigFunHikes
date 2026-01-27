/**
 * Topographic Map - USGS Topo Map inspired design
 *
 * Color scheme: Cream paper (#F5E6D3) + Contour browns (#8B6914) + Forest greens (#2D5016) + Water blues (#4A90A4)
 * Outdoors map style for topographic aesthetic
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ActivityDataPoint } from "@/lib/activity-data-parser";
import { getGradientColor } from "@/lib/activity-data-parser";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

export type ColorMode = "speed" | "hr" | "elevation";
export type CameraMode = "follow" | "overview";

export interface TopographicMapRef {
  flyToSegment: (startIndex: number, endIndex: number) => void;
}

interface TopographicMapProps {
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
  highlightedSegment?: { start: number; end: number } | null;
}

export const TopographicMap = forwardRef<TopographicMapRef, TopographicMapProps>(function TopographicMap({
  dataPoints,
  currentIndex,
  bounds,
  colorMode,
  cameraMode,
  hasHeartRate,
  highlightedSegment,
}, ref) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const startMarker = useRef<mapboxgl.Marker | null>(null);
  const endMarker = useRef<mapboxgl.Marker | null>(null);
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

  // Initialize map with outdoors style (topographic)
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

    // Add scale control styled like a map scale bar
    map.current.addControl(
      new mapboxgl.ScaleControl({ maxWidth: 100, unit: "imperial" }),
      "bottom-right"
    );

    // Minimal navigation
    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: true, visualizePitch: false }),
      "top-right"
    );

    map.current.on("load", () => {
      setMapLoaded(true);

      // Add terrain for 3D elevation
      if (map.current) {
        map.current.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.mapbox-terrain-dem-v1",
          tileSize: 512,
          maxzoom: 14,
        });
        map.current.setTerrain({ source: "mapbox-dem", exaggeration: 1.2 });
      }

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

  // Add route layers with topographic-styled colors
  useEffect(() => {
    if (!map.current || !mapLoaded || dataPoints.length < 2) return;

    // Remove existing layers
    ["route-progress", "route-segments", "route-base", "route-highlight"].forEach((layer) => {
      if (map.current?.getLayer(layer)) map.current.removeLayer(layer);
    });
    ["route-progress", "route-segments", "route-base", "route-highlight"].forEach((source) => {
      if (map.current?.getSource(source)) map.current.removeSource(source);
    });

    const allCoordinates = dataPoints.map((p) => [p.lon, p.lat]);

    // Base route - brown contour line style
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
        "line-color": "#8B6914",
        "line-width": 2,
        "line-opacity": 0.3,
        "line-dasharray": [2, 2], // Dashed like contour lines
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

    // Progress layer - forest green trail
    map.current.addSource("route-progress", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.current.addLayer({
      id: "route-progress",
      type: "line",
      source: "route-progress",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#2D5016",
        "line-width": 4,
        "line-opacity": 0.9,
      },
    });

    // Highlight layer for selected segments
    map.current.addSource("route-highlight", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.current.addLayer({
      id: "route-highlight",
      type: "line",
      source: "route-highlight",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#4A90A4",
        "line-width": 6,
        "line-opacity": 0.8,
      },
    });

    // Add start/end markers with trail symbol style
    const startPoint = dataPoints[0];
    const endPoint = dataPoints[dataPoints.length - 1];

    // Start marker - green triangle
    const startEl = document.createElement("div");
    startEl.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <polygon points="12,4 20,20 4,20" fill="#2D5016" stroke="#1a3a0c" stroke-width="2"/>
        <text x="12" y="16" text-anchor="middle" fill="white" font-size="8" font-weight="bold">S</text>
      </svg>
    `;
    startEl.style.cursor = "pointer";

    if (startMarker.current) startMarker.current.remove();
    startMarker.current = new mapboxgl.Marker({ element: startEl })
      .setLngLat([startPoint.lon, startPoint.lat])
      .addTo(map.current);

    // End marker - red square
    const endEl = document.createElement("div");
    endEl.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" fill="#8B2500" stroke="#5a1900" stroke-width="2"/>
        <text x="12" y="16" text-anchor="middle" fill="white" font-size="8" font-weight="bold">F</text>
      </svg>
    `;
    endEl.style.cursor = "pointer";

    if (endMarker.current) endMarker.current.remove();
    endMarker.current = new mapboxgl.Marker({ element: endEl })
      .setLngLat([endPoint.lon, endPoint.lat])
      .addTo(map.current);
  }, [mapLoaded, dataPoints, colorMode, hasHeartRate]);

  // Update highlighted segment
  useEffect(() => {
    if (!map.current || !mapLoaded || !map.current.getSource("route-highlight")) return;

    if (highlightedSegment) {
      const segmentCoords = dataPoints
        .slice(highlightedSegment.start, highlightedSegment.end + 1)
        .map(p => [p.lon, p.lat]);

      (map.current.getSource("route-highlight") as mapboxgl.GeoJSONSource).setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: segmentCoords },
      });
    } else {
      (map.current.getSource("route-highlight") as mapboxgl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: [],
      });
    }
  }, [highlightedSegment, mapLoaded, dataPoints]);

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
      // Trail marker - compass/direction style
      const el = document.createElement("div");
      el.innerHTML = `
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="12" fill="#4A90A4" stroke="#2D5016" stroke-width="2"/>
          <polygon points="14,6 18,14 14,12 10,14" fill="white"/>
          <circle cx="14" cy="14" r="3" fill="white"/>
        </svg>
      `;
      el.style.transform = "translate(-14px, -14px)";

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

    // Calculate bearing from movement direction
    let bearing = 0;
    if (currentIndex > 0) {
      const prev = dataPoints[currentIndex - 1];
      const dx = currentPoint.lon - prev.lon;
      const dy = currentPoint.lat - prev.lat;
      bearing = (Math.atan2(dx, dy) * 180) / Math.PI;
    }

    map.current.easeTo({
      center: [currentPoint.lon, currentPoint.lat],
      bearing: bearing,
      pitch: 45,
      zoom: 14.5,
      duration: 300,
      easing: (t) => t * (2 - t),
    });
  }, [currentIndex, mapLoaded, dataPoints, cameraMode]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Paper texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Corner decorations - survey markers */}
      <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-[#8B6914] opacity-60" />
      <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-[#8B6914] opacity-60" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-[#8B6914] opacity-60" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-[#8B6914] opacity-60" />
    </div>
  );
});
