import { useEffect, useRef } from "react";
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

interface TrailMapProps {
  entries?: JournalEntry[];
  selectedEntry?: JournalEntry;
  height?: string;
  showFullTrail?: boolean;
  className?: string;
}

export function TrailMap({
  entries = [],
  selectedEntry,
  height = "500px",
  className = "",
}: TrailMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

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

    // Clear existing layers (except tile layer)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

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
  }, [entries, selectedEntry]);

  return (
    <div
      className={`relative rounded-lg overflow-hidden border-2 border-border shadow-lg ${className}`}
      style={{ height }}
    >
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
