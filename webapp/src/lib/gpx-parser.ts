/**
 * GPX Parser Utility
 * Parses GPX files exported from fitness watches (Suunto, Garmin, etc.)
 * Extracts track points, calculates distance and elevation gain
 */

export interface GpxTrackPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
}

export interface GpxParseResult {
  trackPoints: GpxTrackPoint[];
  coordinates: Array<[number, number]>;
  totalDistanceMiles: number;
  totalElevationGainFeet: number;
  startCoords: [number, number] | null;
  endCoords: [number, number] | null;
  startTime?: string;
  endTime?: string;
  rawGpx: string;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in meters
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert meters to miles
 */
function metersToMiles(meters: number): number {
  return meters * 0.000621371;
}

/**
 * Convert meters to feet
 */
function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

/**
 * Parse a GPX file and extract track data
 */
export function parseGpx(gpxContent: string): GpxParseResult {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxContent, "text/xml");

  // Check for parse errors
  const parseError = xmlDoc.querySelector("parsererror");
  if (parseError) {
    throw new Error("Invalid GPX file format");
  }

  // Extract track points from <trkpt> elements
  const trkpts = xmlDoc.querySelectorAll("trkpt");
  const trackPoints: GpxTrackPoint[] = [];

  trkpts.forEach((pt) => {
    const lat = parseFloat(pt.getAttribute("lat") || "0");
    const lon = parseFloat(pt.getAttribute("lon") || "0");

    if (lat === 0 && lon === 0) return;

    const eleElement = pt.querySelector("ele");
    const timeElement = pt.querySelector("time");

    const point: GpxTrackPoint = {
      lat,
      lon,
    };

    if (eleElement?.textContent) {
      point.ele = parseFloat(eleElement.textContent);
    }

    if (timeElement?.textContent) {
      point.time = timeElement.textContent;
    }

    trackPoints.push(point);
  });

  if (trackPoints.length === 0) {
    throw new Error("No track points found in GPX file");
  }

  // Convert to coordinate array for map display
  const coordinates: Array<[number, number]> = trackPoints.map((pt) => [
    pt.lat,
    pt.lon,
  ]);

  // Calculate total distance
  let totalDistanceMeters = 0;
  for (let i = 1; i < trackPoints.length; i++) {
    const prev = trackPoints[i - 1];
    const curr = trackPoints[i];
    totalDistanceMeters += haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
  }

  // Calculate total elevation gain (only count positive elevation changes)
  let totalElevationGainMeters = 0;
  for (let i = 1; i < trackPoints.length; i++) {
    const prev = trackPoints[i - 1];
    const curr = trackPoints[i];
    if (prev.ele !== undefined && curr.ele !== undefined) {
      const elevationChange = curr.ele - prev.ele;
      if (elevationChange > 0) {
        totalElevationGainMeters += elevationChange;
      }
    }
  }

  // Get start/end coordinates
  const startCoords: [number, number] = [
    trackPoints[0].lat,
    trackPoints[0].lon,
  ];
  const endCoords: [number, number] = [
    trackPoints[trackPoints.length - 1].lat,
    trackPoints[trackPoints.length - 1].lon,
  ];

  return {
    trackPoints,
    coordinates,
    totalDistanceMiles: Math.round(metersToMiles(totalDistanceMeters) * 100) / 100,
    totalElevationGainFeet: Math.round(metersToFeet(totalElevationGainMeters)),
    startCoords,
    endCoords,
    startTime: trackPoints[0].time,
    endTime: trackPoints[trackPoints.length - 1].time,
    rawGpx: gpxContent,
  };
}

/**
 * Simplify a GPX track by reducing the number of points
 * Uses Douglas-Peucker-like approach (simplified version)
 * This helps with storage and rendering performance
 */
export function simplifyTrack(
  coordinates: Array<[number, number]>,
  maxPoints: number = 500
): Array<[number, number]> {
  if (coordinates.length <= maxPoints) {
    return coordinates;
  }

  // Simple approach: keep every Nth point
  const step = Math.ceil(coordinates.length / maxPoints);
  const simplified: Array<[number, number]> = [];

  for (let i = 0; i < coordinates.length; i += step) {
    simplified.push(coordinates[i]);
  }

  // Always include the last point
  const lastPoint = coordinates[coordinates.length - 1];
  if (
    simplified[simplified.length - 1][0] !== lastPoint[0] ||
    simplified[simplified.length - 1][1] !== lastPoint[1]
  ) {
    simplified.push(lastPoint);
  }

  return simplified;
}

/**
 * Create a simplified GPX string from coordinates
 * This is what gets stored in the database
 */
export function createSimplifiedGpx(
  coordinates: Array<[number, number]>,
  metadata?: {
    name?: string;
    time?: string;
  }
): string {
  const name = metadata?.name || "Hiking Track";
  const time = metadata?.time || new Date().toISOString();

  const trackPoints = coordinates
    .map(([lat, lon]) => `      <trkpt lat="${lat}" lon="${lon}"></trkpt>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="AT Hiking Journal">
  <metadata>
    <name>${name}</name>
    <time>${time}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;
}

/**
 * Read a GPX file from a File object
 */
export function readGpxFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        reject(new Error("Failed to read file"));
        return;
      }
      resolve(content);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/**
 * Validate that a file is a GPX file
 */
export function isValidGpxFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".gpx") ||
    file.type === "application/gpx+xml" ||
    file.type === "text/xml" ||
    file.type === "application/xml"
  );
}
