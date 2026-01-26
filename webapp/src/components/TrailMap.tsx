import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { JournalEntry } from "@/data/journalEntries";

// Fix for default marker icons - use CDN URLs
const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const iconRetinaUrl =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const shadowUrl =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icon for latest entry (larger, prominent)
const latestEntryIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl,
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  shadowSize: [41, 41],
});

interface OptimizedTrailData {
  name: string;
  pointCount: number;
  bounds: { south: number; north: number; west: number; east: number };
  coordinates: number[]; // flat array: [lat1, lng1, lat2, lng2, ...]
}

interface TrailMapProps {
  entries?: JournalEntry[];
  selectedEntry?: JournalEntry;
  height?: string;
  showFullTrail?: boolean;
  latestEntryMarker?: {
    lat: number;
    lng: number;
    title: string;
    day: number;
    id: string;
  } | null;
  className?: string;
}

export function TrailMap({
  entries = [],
  selectedEntry,
  height = "500px",
  showFullTrail = false,
  latestEntryMarker,
  className = "",
}: TrailMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const trailLayerRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Default center (middle of AT)
    const defaultCenter: [number, number] = [39.5, -77.5];
    const defaultZoom = 5;

    const map = L.map(mapRef.current).setView(defaultCenter, defaultZoom);
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
      maxZoom: 17,
    }).addTo(map);

    setMapReady(true);

    return () => {
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
        popupTimeoutRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
      trailLayerRef.current = null;
      markerRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Load and render full AT trail from optimized JSON
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !showFullTrail) return;

    // Don't reload if already loaded
    if (trailLayerRef.current) return;

    const loadTrail = async () => {
      try {
        const response = await fetch("/data/at-trail-optimized.json");
        if (!response.ok) throw new Error("Failed to load trail data");

        const data: OptimizedTrailData = await response.json();

        // Convert flat array back to coordinate pairs
        const points: [number, number][] = [];
        for (let i = 0; i < data.coordinates.length; i += 2) {
          points.push([data.coordinates[i], data.coordinates[i + 1]]);
        }

        if (points.length > 0) {
          const trailLine = L.polyline(points, {
            color: "#2d5016",
            weight: 3,
            opacity: 0.8,
            smoothFactor: 1,
          }).addTo(map);

          trailLayerRef.current = trailLine;

          // Fit to trail bounds
          map.fitBounds(trailLine.getBounds(), { padding: [20, 20] });
        }
      } catch (error) {
        console.error("Error loading AT trail:", error);
      }
    };

    loadTrail();
  }, [mapReady, showFullTrail]);

  // Add latest entry marker (separate effect to avoid race conditions)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !showFullTrail) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.closePopup();
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    // Clear any pending popup timeout
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
      popupTimeoutRef.current = null;
    }

    // Add new marker if provided
    if (latestEntryMarker) {
      const marker = L.marker([latestEntryMarker.lat, latestEntryMarker.lng], {
        icon: latestEntryIcon,
        zIndexOffset: 1000,
      })
        .bindPopup(
          `
          <div class="text-sm">
            <div class="font-semibold text-orange-600">Current Location</div>
            <a href="/entry/${latestEntryMarker.id}" class="block hover:underline">
              <div class="font-medium">Day ${latestEntryMarker.day}</div>
              <div>${latestEntryMarker.title}</div>
            </a>
          </div>
        `
        )
        .addTo(map);

      markerRef.current = marker;

      // Open popup after a short delay to ensure map is ready
      popupTimeoutRef.current = setTimeout(() => {
        if (markerRef.current) {
          markerRef.current.openPopup();
        }
      }, 500);
    }
  }, [mapReady, showFullTrail, latestEntryMarker]);

  // Handle entries-based display (for timeline/entry detail views)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || showFullTrail) return;

    // Clear existing markers and non-trail polylines
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
      if (layer instanceof L.Polyline && layer !== trailLayerRef.current) {
        map.removeLayer(layer);
      }
    });

    if (entries.length === 0) return;

    const bounds: L.LatLngExpression[] = [];

    const startIcon = L.icon({
      iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const endIcon = L.icon({
      iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    entries.forEach((entry) => {
      const isSelected = selectedEntry?.id === entry.id;

      if (entry.gpxTrack && entry.gpxTrack.length > 0) {
        L.polyline(entry.gpxTrack, {
          color: isSelected ? "#f4a261" : "#4a7c59",
          weight: isSelected ? 4 : 3,
          opacity: isSelected ? 1 : 0.7,
        }).addTo(map);

        bounds.push(...entry.gpxTrack);
      }

      L.marker(entry.coordinates.start, { icon: startIcon })
        .bindPopup(
          `
          <div class="text-sm">
            <div class="font-semibold">Day ${entry.day} - Start</div>
            <div>${entry.location.start}</div>
            <div class="text-xs">${entry.date}</div>
          </div>
        `
        )
        .addTo(map);
      bounds.push(entry.coordinates.start);

      L.marker(entry.coordinates.end, { icon: endIcon })
        .bindPopup(
          `
          <div class="text-sm">
            <div class="font-semibold">Day ${entry.day} - End</div>
            <div>${entry.location.end}</div>
            <div class="text-xs">${entry.miles} miles • ${entry.elevationGain}ft gain</div>
          </div>
        `
        )
        .addTo(map);
      bounds.push(entry.coordinates.end);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
    }
  }, [mapReady, entries, selectedEntry, showFullTrail]);

  return (
    <div
      className={`relative rounded-lg overflow-hidden border-2 border-border shadow-lg ${className}`}
      style={{ height }}
    >
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
