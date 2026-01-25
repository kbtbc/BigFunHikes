import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { JournalEntry } from "@/data/journalEntries";

// Fix for default marker icons - use CDN URLs
const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

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
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl,
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  shadowSize: [41, 41],
});

interface TrailMapProps {
  entries?: JournalEntry[];
  selectedEntry?: JournalEntry;
  height?: string;
  showFullTrail?: boolean;
  latestEntryMarker?: { lat: number; lng: number; title: string; day: number } | null;
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
  const [trailLoaded, setTrailLoaded] = useState(false);
  const trailLayerRef = useRef<L.Polyline | null>(null);

  // Parse GPX file and extract track points (simplified for performance)
  const parseGPX = useCallback(async (gpxText: string): Promise<[number, number][]> => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxText, "text/xml");
    const trkpts = xmlDoc.querySelectorAll("trkpt");

    const points: [number, number][] = [];
    // Sample every Nth point for performance (full trail has ~300k points)
    const sampleRate = Math.max(1, Math.floor(trkpts.length / 5000));

    for (let i = 0; i < trkpts.length; i += sampleRate) {
      const pt = trkpts[i];
      const lat = parseFloat(pt.getAttribute("lat") || "0");
      const lon = parseFloat(pt.getAttribute("lon") || "0");
      if (lat && lon) {
        points.push([lat, lon]);
      }
    }

    // Always include the last point
    if (trkpts.length > 0) {
      const lastPt = trkpts[trkpts.length - 1];
      const lat = parseFloat(lastPt.getAttribute("lat") || "0");
      const lon = parseFloat(lastPt.getAttribute("lon") || "0");
      if (lat && lon) {
        points.push([lat, lon]);
      }
    }

    return points;
  }, []);

  // Load and render full AT trail
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !showFullTrail || trailLoaded) return;

    const loadTrail = async () => {
      try {
        const response = await fetch("/data/appalachian_trail.gpx");
        if (!response.ok) throw new Error("Failed to load GPX");

        const gpxText = await response.text();
        const points = await parseGPX(gpxText);

        if (points.length > 0 && map) {
          // Remove existing trail layer if any
          if (trailLayerRef.current) {
            map.removeLayer(trailLayerRef.current);
          }

          // Add the full trail as a polyline
          const trailLine = L.polyline(points, {
            color: "#2d5016",
            weight: 3,
            opacity: 0.7,
            smoothFactor: 1.5,
          }).addTo(map);

          trailLayerRef.current = trailLine;

          // Fit to trail bounds
          map.fitBounds(trailLine.getBounds(), { padding: [30, 30] });
          setTrailLoaded(true);
        }
      } catch (error) {
        console.error("Error loading AT trail:", error);
      }
    };

    loadTrail();
  }, [showFullTrail, trailLoaded, parseGPX]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Default center on Springer Mountain (AT southern terminus)
    const defaultCenter: [number, number] = [34.6266, -84.1934];
    const defaultZoom = 10;

    // Initialize map
    const map = L.map(mapRef.current).setView(defaultCenter, defaultZoom);
    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
      maxZoom: 17,
    }).addTo(map);

    // Cleanup on unmount
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers and polylines when entries change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing marker layers (but NOT polylines - preserve the full trail)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
      // Only remove polylines that are NOT the full trail
      if (layer instanceof L.Polyline && layer !== trailLayerRef.current) {
        map.removeLayer(layer);
      }
    });

    // If showing full trail with latest entry marker, just add that marker
    if (showFullTrail && latestEntryMarker) {
      const marker = L.marker([latestEntryMarker.lat, latestEntryMarker.lng], {
        icon: latestEntryIcon,
        zIndexOffset: 1000, // Ensure it's on top
      })
        .bindPopup(`
          <div class="text-sm">
            <div class="font-semibold text-orange-600">Current Location</div>
            <div class="font-medium">Day ${latestEntryMarker.day}</div>
            <div>${latestEntryMarker.title}</div>
          </div>
        `)
        .addTo(map);

      // Open popup by default
      marker.openPopup();
      return;
    }

    if (entries.length === 0) return;

    const bounds: L.LatLngExpression[] = [];

    // Create custom icons
    const startIcon = L.icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const endIcon = L.icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    entries.forEach((entry) => {
      const isSelected = selectedEntry?.id === entry.id;

      // Add GPX track line
      if (entry.gpxTrack && entry.gpxTrack.length > 0) {
        L.polyline(entry.gpxTrack, {
          color: isSelected ? "#f4a261" : "#4a7c59",
          weight: isSelected ? 4 : 3,
          opacity: isSelected ? 1 : 0.7,
        }).addTo(map);

        bounds.push(...entry.gpxTrack);
      }

      // Add start marker
      L.marker(entry.coordinates.start, { icon: startIcon })
        .bindPopup(`
          <div class="text-sm">
            <div class="font-semibold">Day ${entry.day} - Start</div>
            <div>${entry.location.start}</div>
            <div class="text-xs">${entry.date}</div>
          </div>
        `)
        .addTo(map);
      bounds.push(entry.coordinates.start);

      // Add end marker
      L.marker(entry.coordinates.end, { icon: endIcon })
        .bindPopup(`
          <div class="text-sm">
            <div class="font-semibold">Day ${entry.day} - End</div>
            <div>${entry.location.end}</div>
            <div class="text-xs">${entry.miles} miles • ${entry.elevationGain}ft gain</div>
          </div>
        `)
        .addTo(map);
      bounds.push(entry.coordinates.end);
    });

    // Fit bounds to show all markers
    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
    }
  }, [entries, selectedEntry, showFullTrail, latestEntryMarker]);

  return (
    <div
      className={`relative rounded-lg overflow-hidden border-2 border-border shadow-lg ${className}`}
      style={{ height }}
    >
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
