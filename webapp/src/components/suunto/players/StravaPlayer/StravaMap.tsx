/**
 * Strava Map - Effort-colored route map for Strava Player
 *
 * Features:
 * - Route colored by effort (pace/speed)
 * - Clean white map style
 * - Minimal UI - map as secondary element
 * - Progress indicator
 */

import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ActivityDataPoint } from "@/lib/activity-data-parser";
import { getGradientColor } from "@/lib/activity-data-parser";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

export interface StravaMapRef {
  flyToSegment: (startIndex: number, endIndex: number) => void;
}

interface StravaMapProps {
  dataPoints: ActivityDataPoint[];
  currentIndex: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  hasHeartRate: boolean;
}

// Strava-style effort colors (green = easy, yellow = moderate, red = hard)
function getEffortColor(speed: number, minSpeed: number, maxSpeed: number): string {
  if (speed === undefined || speed === null || isNaN(speed)) {
    return "#FC4C02"; // Strava orange as default
  }

  // Invert for pace - slower speed = easier effort (green)
  const ratio = maxSpeed === minSpeed ? 0.5 : (speed - minSpeed) / (maxSpeed - minSpeed);
  const clampedRatio = Math.max(0, Math.min(1, ratio));

  // Strava effort colors: green (easy) -> yellow -> orange -> red (hard)
  const colors = [
    { r: 34, g: 197, b: 94 },   // Green (slow/easy)
    { r: 234, g: 179, b: 8 },   // Yellow
    { r: 252, g: 76, b: 2 },    // Strava Orange
    { r: 239, g: 68, b: 68 },   // Red (fast/hard)
  ];

  const segment = clampedRatio * (colors.length - 1);
  const index = Math.floor(segment);
  const segmentRatio = segment - index;

  const c1 = colors[Math.min(index, colors.length - 1)];
  const c2 = colors[Math.min(index + 1, colors.length - 1)];

  const r = Math.round(c1.r + (c2.r - c1.r) * segmentRatio);
  const g = Math.round(c1.g + (c2.g - c1.g) * segmentRatio);
  const b = Math.round(c1.b + (c2.b - c1.b) * segmentRatio);

  return `rgb(${r}, ${g}, ${b})`;
}

export const StravaMap = forwardRef<StravaMapRef, StravaMapProps>(
  function StravaMap({ dataPoints, currentIndex, bounds, hasHeartRate }, ref) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const marker = useRef<mapboxgl.Marker | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    // Expose flyToSegment method
    useImperativeHandle(ref, () => ({
      flyToSegment: (startIndex: number, endIndex: number) => {
        if (!map.current) return;

        const segmentPoints = dataPoints.slice(startIndex, endIndex + 1);
        if (segmentPoints.length < 2) return;

        const lngs = segmentPoints.map((p) => p.lon);
        const lats = segmentPoints.map((p) => p.lat);

        map.current.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 60, maxZoom: 15, duration: 800 }
        );
      },
    }));

    // Initialize map
    useEffect(() => {
      if (!mapContainer.current || map.current) return;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        // Light/clean style for Strava look
        style: "mapbox://styles/mapbox/light-v11",
        center: [
          (bounds.east + bounds.west) / 2,
          (bounds.north + bounds.south) / 2,
        ],
        zoom: 12,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
      });

      // Minimal controls
      map.current.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "top-right"
      );

      map.current.on("load", () => {
        setMapLoaded(true);

        // Fit to bounds with padding
        map.current?.fitBounds(
          [
            [bounds.west, bounds.south],
            [bounds.east, bounds.north],
          ],
          { padding: 40, maxZoom: 14 }
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
      ["route-progress", "route-effort", "route-base"].forEach((layer) => {
        if (map.current?.getLayer(layer)) map.current.removeLayer(layer);
      });
      ["route-progress", "route-effort", "route-base"].forEach((source) => {
        if (map.current?.getSource(source)) map.current.removeSource(source);
      });

      const allCoordinates = dataPoints.map((p) => [p.lon, p.lat]);

      // Get speed range for effort coloring
      const speeds = dataPoints
        .map((p) => p.speed)
        .filter((s): s is number => s !== undefined && s > 0);
      const minSpeed = speeds.length > 0 ? Math.min(...speeds) : 0;
      const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 1;

      // Base route (shadow/outline)
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
          "line-color": "#e5e7eb",
          "line-width": 6,
          "line-opacity": 1,
        },
      });

      // Effort-colored segments
      const effortFeatures: GeoJSON.Feature[] = [];
      for (let i = 0; i < dataPoints.length - 1; i++) {
        const p1 = dataPoints[i];
        const p2 = dataPoints[i + 1];
        const speed = p1.speed ?? 0;
        const color = getEffortColor(speed, minSpeed, maxSpeed);

        effortFeatures.push({
          type: "Feature",
          properties: { color },
          geometry: {
            type: "LineString",
            coordinates: [
              [p1.lon, p1.lat],
              [p2.lon, p2.lat],
            ],
          },
        });
      }

      map.current.addSource("route-effort", {
        type: "geojson",
        data: { type: "FeatureCollection", features: effortFeatures },
      });

      map.current.addLayer({
        id: "route-effort",
        type: "line",
        source: "route-effort",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 4,
          "line-opacity": 0.4,
        },
      });

      // Progress layer (bright, shows completed portion)
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
          "line-color": ["get", "color"],
          "line-width": 4,
          "line-opacity": 1,
        },
      });
    }, [mapLoaded, dataPoints]);

    // Update progress
    useEffect(() => {
      if (!map.current || !mapLoaded || !map.current.getSource("route-progress"))
        return;

      const speeds = dataPoints
        .map((p) => p.speed)
        .filter((s): s is number => s !== undefined && s > 0);
      const minSpeed = speeds.length > 0 ? Math.min(...speeds) : 0;
      const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 1;

      const progressFeatures: GeoJSON.Feature[] = [];
      for (let i = 0; i < Math.min(currentIndex, dataPoints.length - 1); i++) {
        const p1 = dataPoints[i];
        const p2 = dataPoints[i + 1];
        const speed = p1.speed ?? 0;
        const color = getEffortColor(speed, minSpeed, maxSpeed);

        progressFeatures.push({
          type: "Feature",
          properties: { color },
          geometry: {
            type: "LineString",
            coordinates: [
              [p1.lon, p1.lat],
              [p2.lon, p2.lat],
            ],
          },
        });
      }

      (map.current.getSource("route-progress") as mapboxgl.GeoJSONSource).setData(
        {
          type: "FeatureCollection",
          features: progressFeatures,
        }
      );
    }, [currentIndex, mapLoaded, dataPoints]);

    // Update marker
    useEffect(() => {
      if (!map.current || !mapLoaded) return;

      const currentPoint = dataPoints[currentIndex];
      if (!currentPoint) return;

      if (!marker.current) {
        // Strava-style marker
        const el = document.createElement("div");
        el.style.cssText = `
          width: 16px;
          height: 16px;
          background: #FC4C02;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        `;

        marker.current = new mapboxgl.Marker({ element: el })
          .setLngLat([currentPoint.lon, currentPoint.lat])
          .addTo(map.current);
      } else {
        marker.current.setLngLat([currentPoint.lon, currentPoint.lat]);
      }
    }, [currentIndex, mapLoaded, dataPoints]);

    return (
      <div className="relative w-full h-full">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Effort Legend */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-500 font-medium">Effort:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600">Easy</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-gray-600">Moderate</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-[#FC4C02]" />
              <span className="text-gray-600">Hard</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
