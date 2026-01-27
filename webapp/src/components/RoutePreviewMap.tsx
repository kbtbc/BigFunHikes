import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface RoutePreviewMapProps {
  routeSegment: [number, number][];
  startLat?: string;
  startLon?: string;
  endLat?: string;
  endLon?: string;
}

export function RoutePreviewMap({
  routeSegment,
  startLat,
  startLon,
  endLat,
  endLon,
}: RoutePreviewMapProps) {
  const [mapKey, setMapKey] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [iconsFixed, setIconsFixed] = useState(false);

  // Fix Leaflet icon issue on client-side only
  useEffect(() => {
    if (typeof window !== "undefined" && !iconsFixed) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });
        setIconsFixed(true);
        console.log("[RoutePreviewMap] Leaflet icons fixed");
      } catch (error) {
        console.error("[RoutePreviewMap] Failed to fix Leaflet icons:", error);
      }
    }
  }, [iconsFixed]);

  useEffect(() => {
    console.log("[RoutePreviewMap] Component mounted, setting isClient to true");
    setIsClient(true);
  }, []);

  // Force re-render when route changes
  useEffect(() => {
    console.log("[RoutePreviewMap] Route segment changed, length:", routeSegment.length);
    console.log("[RoutePreviewMap] Props:", { startLat, startLon, endLat, endLon });
    if (routeSegment.length > 0) {
      console.log("[RoutePreviewMap] Setting new mapKey");
      setMapKey((prev) => prev + 1);
    }
  }, [routeSegment.length, startLat, startLon, endLat, endLon]);

  if (!isClient || !iconsFixed) {
    console.log("[RoutePreviewMap] Not ready yet:", { isClient, iconsFixed });
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Initializing...
      </div>
    );
  }

  if (routeSegment.length === 0) {
    console.log("[RoutePreviewMap] No route segment, showing empty message");
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm px-4 text-center">
        Enter start and end coordinates to preview your route on the Appalachian Trail
      </div>
    );
  }

  // Validate route segment contains valid coordinates
  const hasInvalidPoints = routeSegment.some(
    ([lat, lon]) => !isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180
  );

  if (hasInvalidPoints) {
    console.error("[RoutePreviewMap] Route segment contains invalid coordinates");
    return (
      <div className="h-full flex items-center justify-center text-destructive text-sm px-4 text-center">
        Invalid route coordinates detected
      </div>
    );
  }

  // Calculate map center
  const midIdx = Math.floor(routeSegment.length / 2);
  const center: [number, number] = routeSegment[midIdx] || [35.9132, -83.8078];

  console.log("[RoutePreviewMap] Rendering map with:", {
    routeSegmentLength: routeSegment.length,
    center,
    mapKey,
    firstPoint: routeSegment[0],
    lastPoint: routeSegment[routeSegment.length - 1]
  });

  // Validate and parse marker coordinates
  const startLatNum = startLat ? parseFloat(startLat) : NaN;
  const startLonNum = startLon ? parseFloat(startLon) : NaN;
  const endLatNum = endLat ? parseFloat(endLat) : NaN;
  const endLonNum = endLon ? parseFloat(endLon) : NaN;

  const hasValidStart = !isNaN(startLatNum) && !isNaN(startLonNum) &&
                        startLatNum >= -90 && startLatNum <= 90 &&
                        startLonNum >= -180 && startLonNum <= 180;
  const hasValidEnd = !isNaN(endLatNum) && !isNaN(endLonNum) &&
                      endLatNum >= -90 && endLatNum <= 90 &&
                      endLonNum >= -180 && endLonNum <= 180;

  console.log("[RoutePreviewMap] Marker validation:", {
    startLat: startLatNum,
    startLon: startLonNum,
    endLat: endLatNum,
    endLon: endLonNum,
    hasValidStart,
    hasValidEnd
  });

  try {
    return (
      <MapContainer
        key={mapKey}
        center={center}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenTopoMap contributors'
        />
        <Polyline
          positions={routeSegment}
          pathOptions={{
            color: "#4a7c59",
            weight: 4,
            opacity: 0.8,
          }}
        />
        {hasValidStart && (
          <Marker position={[startLatNum, startLonNum]}>
            <Popup>Start Point</Popup>
          </Marker>
        )}
        {hasValidEnd && (
          <Marker position={[endLatNum, endLonNum]}>
            <Popup>End Point</Popup>
          </Marker>
        )}
      </MapContainer>
    );
  } catch (error) {
    console.error("Map error:", error);
    return (
      <div className="h-full flex items-center justify-center text-destructive text-sm px-4 text-center">
        Failed to load map. Please refresh the page.
      </div>
    );
  }
}
