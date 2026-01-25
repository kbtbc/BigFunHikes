import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTrailSegmentForEntry } from "@/hooks/use-dynamic-trail-segment";

const shadowUrl =
  "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

// Custom icons
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

// Custom icon for training hikes (orange/amber)
const trainingIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface EntryMapProps {
  dayNumber: number;
  title: string;
  // Current entry coordinates
  latitude?: number | null;
  longitude?: number | null;
  // Previous entry coordinates (for route calculation)
  prevLatitude?: number | null;
  prevLongitude?: number | null;
  startLocation?: string;
  endLocation?: string;
  milesHiked?: number;
  height?: string;
  className?: string;
  // Entry type - training entries show single marker, no trail segment
  entryType?: "trail" | "training";
  // GPX track data - when present, displays actual recorded route instead of AT segment
  gpxTrack?: Array<[number, number]>;
}

export function EntryMap({
  dayNumber,
  title,
  latitude,
  longitude,
  prevLatitude,
  prevLongitude,
  startLocation,
  endLocation,
  milesHiked,
  height = "300px",
  className = "",
  entryType = "trail",
  gpxTrack,
}: EntryMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const isTraining = entryType === "training";
  const hasGpxTrack = gpxTrack && gpxTrack.length > 0;

  // Use dynamic trail segment based on actual coordinates
  // Skip trail segment calculation for training entries or when GPX track is present
  const { coordinates, bounds, loading, error } = useTrailSegmentForEntry(
    isTraining || hasGpxTrack ? null : (latitude ?? null),
    isTraining || hasGpxTrack ? null : (longitude ?? null),
    isTraining || hasGpxTrack ? null : prevLatitude,
    isTraining || hasGpxTrack ? null : prevLongitude
  );

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Default center (will be updated when segment loads)
    const defaultCenter: [number, number] = [34.8, -83.8];
    const defaultZoom = 11;

    const map = L.map(mapRef.current, {
      scrollWheelZoom: false, // Disable scroll zoom for embedded maps
    }).setView(defaultCenter, defaultZoom);

    mapInstanceRef.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
      maxZoom: 17,
    }).addTo(map);

    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Draw trail segment and markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    // Clear existing layers (except tile layer)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // For training entries WITHOUT GPX data, show a single marker at the location
    if (isTraining && !hasGpxTrack && latitude && longitude) {
      L.marker([latitude, longitude], { icon: trainingIcon })
        .bindPopup(
          `<div class="text-sm">
            <div class="font-semibold text-amber-600">Training Hike</div>
            <div>${title}</div>
            ${milesHiked ? `<div class="text-xs mt-1">${milesHiked} miles hiked</div>` : ""}
            ${startLocation ? `<div class="text-xs text-gray-500">${startLocation}</div>` : ""}
          </div>`
        )
        .addTo(map);

      map.setView([latitude, longitude], 13);
      return;
    }

    // If we have GPX track data, display the actual recorded route
    if (hasGpxTrack && gpxTrack) {
      // Draw the GPX track (use different color to distinguish from AT trail)
      const gpxLine = L.polyline(gpxTrack, {
        color: isTraining ? "#b45309" : "#991b1b", // Dark amber for training, dark red for trail
        weight: 5,
        opacity: 0.95,
      }).addTo(map);

      // Add start marker
      const gpxStartPoint = gpxTrack[0];
      L.marker(gpxStartPoint, { icon: startIcon })
        .bindPopup(
          `<div class="text-sm">
            <div class="font-semibold text-green-600">Start</div>
            <div>${startLocation || (isTraining ? "Training Start" : "Day " + dayNumber + " Start")}</div>
            <div class="text-xs text-blue-600 mt-1">GPS Track</div>
          </div>`
        )
        .addTo(map);

      // Add end marker
      const gpxEndPoint = gpxTrack[gpxTrack.length - 1];
      L.marker(gpxEndPoint, { icon: isTraining ? trainingIcon : endIcon })
        .bindPopup(
          `<div class="text-sm">
            <div class="font-semibold ${isTraining ? "text-amber-600" : "text-red-600"}">End</div>
            <div>${endLocation || title}</div>
            ${milesHiked ? `<div class="text-xs mt-1">${milesHiked} miles hiked</div>` : ""}
            <div class="text-xs text-blue-600 mt-1">GPS Track</div>
          </div>`
        )
        .addTo(map);

      // Fit bounds to GPX track
      map.fitBounds(gpxLine.getBounds(), { padding: [30, 30] });
      return;
    }

    // If we have coordinates from the AT trail segment, draw them
    if (coordinates.length > 0) {
      // Draw the trail segment
      const trailLine = L.polyline(coordinates, {
        color: "#4a7c59",
        weight: 4,
        opacity: 0.9,
      }).addTo(map);

      // Add start marker
      const startPoint = coordinates[0];
      L.marker(startPoint, { icon: startIcon })
        .bindPopup(
          `<div class="text-sm">
            <div class="font-semibold text-green-600">Start</div>
            <div>${startLocation || "Day " + dayNumber + " Start"}</div>
          </div>`
        )
        .addTo(map);

      // Add end marker
      const endPoint = coordinates[coordinates.length - 1];
      L.marker(endPoint, { icon: endIcon })
        .bindPopup(
          `<div class="text-sm">
            <div class="font-semibold text-red-600">End</div>
            <div>${endLocation || title}</div>
            ${milesHiked ? `<div class="text-xs mt-1">${milesHiked} miles hiked</div>` : ""}
          </div>`
        )
        .addTo(map);

      // Fit bounds with padding
      if (bounds) {
        map.fitBounds(
          [
            [bounds.south, bounds.west],
            [bounds.north, bounds.east],
          ],
          { padding: [30, 30] }
        );
      } else {
        map.fitBounds(trailLine.getBounds(), { padding: [30, 30] });
      }
    } else if (latitude && longitude) {
      // Fallback: just show marker at entry location if no trail segment
      L.marker([latitude, longitude], { icon: endIcon })
        .bindPopup(
          `<div class="text-sm">
            <div class="font-semibold">Day ${dayNumber}</div>
            <div>${title}</div>
            ${milesHiked ? `<div class="text-xs mt-1">${milesHiked} miles hiked</div>` : ""}
          </div>`
        )
        .addTo(map);

      map.setView([latitude, longitude], 12);
    }
  }, [
    mapReady,
    coordinates,
    bounds,
    dayNumber,
    title,
    latitude,
    longitude,
    startLocation,
    endLocation,
    milesHiked,
    isTraining,
    hasGpxTrack,
    gpxTrack,
  ]);

  // Show placeholder if no coordinates at all (unless we have GPX track)
  if (!latitude && !longitude && !hasGpxTrack && !loading) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded-lg ${className}`}
        style={{ height }}
      >
        <p className="text-muted-foreground text-sm">No location data available</p>
      </div>
    );
  }

  if (error && !coordinates.length && !hasGpxTrack) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded-lg ${className}`}
        style={{ height }}
      >
        <p className="text-muted-foreground text-sm">Map unavailable</p>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-lg overflow-hidden border border-border shadow-md ${className}`}
      style={{ height }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <p className="text-muted-foreground text-sm">Loading trail...</p>
        </div>
      )}
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
