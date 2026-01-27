/**
 * Cinematic Map - Full-screen immersive Mapbox GL map for Cinematic player
 *
 * Color scheme: Deep black (#0a0a0a) + Gold accents (#d4af37, #f4d03f)
 * Dramatic camera angles with first-person default and high pitch
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { ActivityDataPoint } from "@/lib/activity-data-parser";
import { getGradientColor } from "@/lib/activity-data-parser";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "";

export type CameraMode = "firstPerson" | "follow" | "overview" | "cinematic";

export interface CinematicMapRef {
  flyToSegment: (startIndex: number, endIndex: number) => void;
}

interface CinematicMapProps {
  dataPoints: ActivityDataPoint[];
  currentIndex: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  cameraMode: CameraMode;
  terrain3D: boolean;
}

export const CinematicMap = forwardRef<CinematicMapRef, CinematicMapProps>(function CinematicMap({
  dataPoints,
  currentIndex,
  bounds,
  cameraMode,
  terrain3D,
}, ref) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleReady, setStyleReady] = useState(false);
  const lastCameraUpdate = useRef<number>(0);
  const lastBearing = useRef<number>(0);
  const cinematicPhase = useRef<number>(0);

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
      ], { padding: 80, maxZoom: 16, duration: 1500 });
    }
  }));

  // Initialize map with dramatic dark styling
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [
        (bounds.east + bounds.west) / 2,
        (bounds.north + bounds.south) / 2,
      ],
      zoom: 15,
      pitch: 75, // High dramatic pitch
      bearing: 0,
    });

    // Minimal controls for cinematic feel
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: true, showZoom: false }), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
      setStyleReady(true);

      // Start with dramatic zoom to route
      map.current?.fitBounds(
        [
          [bounds.west, bounds.south],
          [bounds.east, bounds.north],
        ],
        { padding: 60, maxZoom: 16, pitch: 75, duration: 2000 }
      );
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [bounds]);

  // Add 3D terrain with higher exaggeration for drama
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

      // Higher exaggeration for dramatic effect
      map.current.setTerrain({ source: "mapbox-dem", exaggeration: 3.0 });

      // Dramatic sky atmosphere
      if (!map.current.getLayer("sky")) {
        map.current.addLayer({
          id: "sky",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [0.0, 75.0],
            "sky-atmosphere-sun-intensity": 10,
          },
        });
      }

      // Add fog for depth and atmosphere
      map.current.setFog({
        range: [0.5, 10],
        color: "#1a1a1a",
        "high-color": "#2a2a2a",
        "horizon-blend": 0.1,
        "space-color": "#0a0a0a",
        "star-intensity": 0.15,
      });
    } else {
      map.current.setTerrain(null);
      map.current.setFog(null);
      if (map.current.getLayer("sky")) {
        map.current.removeLayer("sky");
      }
    }
  }, [terrain3D, mapLoaded, styleReady]);

  // Add route layers with gold color scheme
  useEffect(() => {
    if (!map.current || !mapLoaded || !styleReady || dataPoints.length < 2) return;

    // Remove existing layers
    ["route-glow", "route-progress-glow", "route-progress", "route-base"].forEach((layer) => {
      if (map.current?.getLayer(layer)) map.current.removeLayer(layer);
    });
    ["route-glow", "route-progress-glow", "route-progress", "route-base"].forEach((source) => {
      if (map.current?.getSource(source)) map.current.removeSource(source);
    });

    const allCoordinates = dataPoints.map((p) => [p.lon, p.lat]);

    // Base route - subtle gold outline
    map.current.addSource("route-base", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: allCoordinates },
      },
    });

    // Outer glow layer
    map.current.addLayer({
      id: "route-glow",
      type: "line",
      source: "route-base",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#d4af37",
        "line-width": 12,
        "line-opacity": 0.15,
        "line-blur": 8,
      },
    });

    map.current.addLayer({
      id: "route-base",
      type: "line",
      source: "route-base",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#8b7355",
        "line-width": 4,
        "line-opacity": 0.4,
      },
    });

    // Progress layer with glow
    map.current.addSource("route-progress", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.current.addSource("route-progress-glow", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    map.current.addLayer({
      id: "route-progress-glow",
      type: "line",
      source: "route-progress-glow",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#f4d03f",
        "line-width": 14,
        "line-opacity": 0.3,
        "line-blur": 6,
      },
    });

    map.current.addLayer({
      id: "route-progress",
      type: "line",
      source: "route-progress",
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#d4af37",
        "line-width": 5,
        "line-opacity": 1,
      },
    });
  }, [mapLoaded, styleReady, dataPoints]);

  // Update progress with golden trail
  useEffect(() => {
    if (!map.current || !mapLoaded || !map.current.getSource("route-progress")) return;

    const progressCoordinates = dataPoints.slice(0, currentIndex + 1).map(p => [p.lon, p.lat]);

    if (progressCoordinates.length >= 2) {
      const lineData = {
        type: "Feature" as const,
        properties: {},
        geometry: { type: "LineString" as const, coordinates: progressCoordinates },
      };

      (map.current.getSource("route-progress") as mapboxgl.GeoJSONSource).setData(lineData);
      (map.current.getSource("route-progress-glow") as mapboxgl.GeoJSONSource).setData(lineData);
    }
  }, [currentIndex, mapLoaded, dataPoints]);

  // Update marker and dramatic camera
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const currentPoint = dataPoints[currentIndex];
    if (!currentPoint) return;

    // Create golden glowing marker
    if (!marker.current) {
      const el = document.createElement("div");
      el.innerHTML = `
        <div class="cinematic-marker">
          <div class="cinematic-marker-pulse"></div>
          <div class="cinematic-marker-core"></div>
        </div>
      `;
      el.style.cssText = `
        width: 40px;
        height: 40px;
        position: relative;
      `;

      const style = document.createElement("style");
      style.textContent = `
        .cinematic-marker {
          width: 100%;
          height: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cinematic-marker-pulse {
          position: absolute;
          width: 40px;
          height: 40px;
          background: radial-gradient(circle, rgba(212,175,55,0.6) 0%, transparent 70%);
          border-radius: 50%;
          animation: cinematic-pulse 2s ease-out infinite;
        }
        .cinematic-marker-core {
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, #f4d03f 0%, #d4af37 50%, #b8962e 100%);
          border: 2px solid #fff;
          border-radius: 50%;
          box-shadow: 0 0 20px rgba(212,175,55,0.8), 0 0 40px rgba(212,175,55,0.4);
          z-index: 1;
        }
        @keyframes cinematic-pulse {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
      `;
      document.head.appendChild(style);

      marker.current = new mapboxgl.Marker({ element: el })
        .setLngLat([currentPoint.lon, currentPoint.lat])
        .addTo(map.current);
    } else {
      marker.current.setLngLat([currentPoint.lon, currentPoint.lat]);
    }

    // Skip camera updates in overview mode
    if (cameraMode === "overview") return;

    // Throttle camera updates for smooth cinematic feel
    const now = Date.now();
    if (now - lastCameraUpdate.current < 100) return;
    lastCameraUpdate.current = now;

    const nextIndex = Math.min(currentIndex + 8, dataPoints.length - 1);
    const nextPoint = dataPoints[nextIndex];

    // Calculate bearing to next point
    let targetBearing = lastBearing.current;
    if (nextPoint && (nextPoint.lat !== currentPoint.lat || nextPoint.lon !== currentPoint.lon)) {
      const dLon = (nextPoint.lon - currentPoint.lon) * Math.PI / 180;
      const lat1 = currentPoint.lat * Math.PI / 180;
      const lat2 = nextPoint.lat * Math.PI / 180;
      const y = Math.sin(dLon) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
      targetBearing = Math.atan2(y, x) * 180 / Math.PI;
    }

    // Smooth bearing transitions
    const bearingDiff = targetBearing - lastBearing.current;
    const normalizedDiff = ((bearingDiff + 540) % 360) - 180;
    lastBearing.current = lastBearing.current + normalizedDiff * 0.06;

    if (cameraMode === "firstPerson") {
      // First-person: dramatic forward-looking view
      map.current.easeTo({
        center: [currentPoint.lon, currentPoint.lat],
        bearing: lastBearing.current,
        pitch: 78,
        zoom: 16.5,
        duration: 150,
        easing: (t) => t,
      });
    } else if (cameraMode === "follow") {
      // Follow mode: slightly behind and above
      map.current.easeTo({
        center: [currentPoint.lon, currentPoint.lat],
        bearing: lastBearing.current,
        pitch: 65,
        zoom: 15.5,
        duration: 200,
        easing: (t) => t,
      });
    } else if (cameraMode === "cinematic") {
      // Cinematic mode: slowly orbiting dramatic angles
      cinematicPhase.current += 0.002;
      const orbitOffset = Math.sin(cinematicPhase.current) * 30;
      const pitchOscillation = 70 + Math.sin(cinematicPhase.current * 0.5) * 8;
      const zoomOscillation = 15.5 + Math.sin(cinematicPhase.current * 0.3) * 0.5;

      map.current.easeTo({
        center: [currentPoint.lon, currentPoint.lat],
        bearing: lastBearing.current + orbitOffset,
        pitch: pitchOscillation,
        zoom: zoomOscillation,
        duration: 250,
        easing: (t) => t,
      });
    }
  }, [currentIndex, mapLoaded, dataPoints, cameraMode]);

  return (
    <div className="relative w-full h-full bg-[#0a0a0a]">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Cinematic letterbox bars */}
      <div className="absolute inset-x-0 top-0 h-[3vh] bg-black pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-[3vh] bg-black pointer-events-none" />

      {/* Subtle vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)",
        }}
      />
    </div>
  );
});
