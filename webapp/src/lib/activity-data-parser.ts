/**
 * Unified Activity Data Parser
 * Normalizes Suunto JSON and GPX data into a common format for the Activity Player
 * Auto-detects source format and extracts all available metrics
 */

import { parseSuuntoJson, type SuuntoParseResult } from "./suunto-parser";
import { parseGpx, type GpxParseResult } from "./gpx-parser";

// ============================================================================
// Unified Activity Data Types
// ============================================================================

export interface ActivityDataPoint {
  timestamp: number; // ms since activity start
  lat: number;
  lon: number;
  elevation?: number; // meters
  speed?: number; // m/s
  hr?: number; // bpm
  cadence?: number; // steps/min
  distance?: number; // cumulative meters from start
  grade?: number; // percent grade
  isMoving?: boolean;
  temperature?: number; // Celsius
}

export interface ActivityPhoto {
  id: string;
  url: string;
  caption?: string | null;
  timestamp?: number; // ms since activity start (if available)
  lat?: number;
  lon?: number;
}

export interface ActivitySummary {
  startTime: string;
  duration: number; // seconds
  distance: number; // meters
  elevationGain: number; // meters
  elevationLoss: number; // meters
  avgSpeed: number; // m/s
  maxSpeed: number; // m/s
  avgHr?: number; // bpm
  maxHr?: number; // bpm
  minHr?: number; // bpm
  avgCadence?: number;
  calories?: number;
}

export interface ActivityData {
  source: "suunto" | "gpx" | "unknown";
  summary: ActivitySummary;
  dataPoints: ActivityDataPoint[];
  hasHeartRate: boolean;
  hasCadence: boolean;
  hasSpeed: boolean;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

// ============================================================================
// Conversion Helpers
// ============================================================================

function metersToMiles(m: number): number {
  return m * 0.000621371;
}

function msToMph(ms: number): number {
  return ms * 2.23694;
}

function metersToFeet(m: number): number {
  return m * 3.28084;
}

/**
 * Calculate speed between two points
 */
function calculateSpeed(
  p1: { lat: number; lon: number; timestamp: number },
  p2: { lat: number; lon: number; timestamp: number }
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  const timeDiff = (p2.timestamp - p1.timestamp) / 1000; // seconds
  if (timeDiff <= 0) return 0;

  return distance / timeDiff; // m/s
}

/**
 * Calculate grade (slope percentage) between two points
 */
function calculateGrade(
  ele1: number | undefined,
  ele2: number | undefined,
  distance: number
): number | undefined {
  if (ele1 === undefined || ele2 === undefined || distance === 0) return undefined;
  return ((ele2 - ele1) / distance) * 100;
}

/**
 * Calculate cumulative distance from start
 */
function calculateCumulativeDistance(
  points: Array<{ lat: number; lon: number }>
): number[] {
  const distances: number[] = [0];
  let cumulative = 0;

  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];

    const R = 6371000;
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    cumulative += R * c;
    distances.push(cumulative);
  }

  return distances;
}

/**
 * Determine if point represents movement vs stopped
 */
function isMoving(speed: number | undefined): boolean {
  if (speed === undefined) return true;
  return speed > 0.3; // ~0.7 mph threshold
}

/**
 * Resample data points to consistent intervals (e.g., 1s or 5s)
 */
export function resampleDataPoints(
  points: ActivityDataPoint[],
  intervalMs: number = 5000
): ActivityDataPoint[] {
  if (points.length < 2) return points;

  const resampled: ActivityDataPoint[] = [];
  const startTime = points[0].timestamp;
  const endTime = points[points.length - 1].timestamp;

  for (let t = startTime; t <= endTime; t += intervalMs) {
    // Find surrounding points for interpolation
    let before = points[0];
    let after = points[points.length - 1];

    for (let i = 0; i < points.length - 1; i++) {
      if (points[i].timestamp <= t && points[i + 1].timestamp >= t) {
        before = points[i];
        after = points[i + 1];
        break;
      }
    }

    // Linear interpolation
    const ratio = after.timestamp === before.timestamp
      ? 0
      : (t - before.timestamp) / (after.timestamp - before.timestamp);

    const interpolated: ActivityDataPoint = {
      timestamp: t,
      lat: before.lat + (after.lat - before.lat) * ratio,
      lon: before.lon + (after.lon - before.lon) * ratio,
      elevation: before.elevation !== undefined && after.elevation !== undefined
        ? before.elevation + (after.elevation - before.elevation) * ratio
        : before.elevation,
      speed: before.speed !== undefined && after.speed !== undefined
        ? before.speed + (after.speed - before.speed) * ratio
        : before.speed,
      hr: before.hr !== undefined && after.hr !== undefined
        ? Math.round(before.hr + (after.hr - before.hr) * ratio)
        : before.hr,
      cadence: before.cadence !== undefined && after.cadence !== undefined
        ? Math.round(before.cadence + (after.cadence - before.cadence) * ratio)
        : before.cadence,
      distance: before.distance !== undefined && after.distance !== undefined
        ? before.distance + (after.distance - before.distance) * ratio
        : before.distance,
      grade: before.grade,
      isMoving: before.isMoving,
      temperature: before.temperature !== undefined && after.temperature !== undefined
        ? Math.round((before.temperature + (after.temperature - before.temperature) * ratio) * 10) / 10
        : before.temperature,
    };

    resampled.push(interpolated);
  }

  return resampled;
}

/**
 * Smooth elevation data to reduce GPS noise
 */
function smoothElevation(points: ActivityDataPoint[], windowSize: number = 5): void {
  if (points.length < windowSize) return;

  const elevations = points.map(p => p.elevation);

  for (let i = 0; i < points.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(points.length, i + Math.floor(windowSize / 2) + 1);
    const window = elevations.slice(start, end).filter((e): e is number => e !== undefined);

    if (window.length > 0) {
      points[i].elevation = window.reduce((a, b) => a + b, 0) / window.length;
    }
  }
}

// ============================================================================
// Suunto JSON Parser
// ============================================================================

function parseSuuntoActivity(suuntoData: SuuntoParseResult): ActivityData {
  const gpsTrack = suuntoData.gpsTrack;
  const timeSamples = suuntoData.timeSamples || [];
  const hrOverTime = suuntoData.hrOverTime || [];

  if (!gpsTrack.length) {
    throw new Error("No GPS track data found in Suunto file");
  }

  const startTime = new Date(gpsTrack[0].timestamp).getTime();

  // Build data points from GPS track + time samples
  const dataPoints: ActivityDataPoint[] = [];

  // Create a map of time samples by timestamp for quick lookup
  const sampleMap = new Map<number, typeof timeSamples[0]>();
  for (const sample of timeSamples) {
    const sampleTime = new Date(sample.timestamp).getTime();
    sampleMap.set(Math.floor((sampleTime - startTime) / 1000), sample);
  }

  // Sort hrOverTime by time for binary search / interpolation
  const sortedHr = [...hrOverTime].sort((a, b) => a.time - b.time);

  // Find closest HR value using binary search for better matching
  function findClosestHr(secondsFromStart: number): number | undefined {
    if (sortedHr.length === 0) return undefined;

    // Binary search to find closest HR reading
    let low = 0;
    let high = sortedHr.length - 1;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (sortedHr[mid].time < secondsFromStart) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    // Check both low and low-1 to find the closest
    const candidates = [sortedHr[low]];
    if (low > 0) candidates.push(sortedHr[low - 1]);

    let closest = candidates[0];
    let minDiff = Math.abs(closest.time - secondsFromStart);

    for (const c of candidates) {
      const diff = Math.abs(c.time - secondsFromStart);
      if (diff < minDiff) {
        minDiff = diff;
        closest = c;
      }
    }

    // Only return if within reasonable time window (60 seconds)
    if (minDiff <= 60) {
      return closest.hr;
    }
    return undefined;
  }

  // Process GPS points
  const distances = calculateCumulativeDistance(gpsTrack);

  for (let i = 0; i < gpsTrack.length; i++) {
    const gps = gpsTrack[i];
    const gpsTime = new Date(gps.timestamp).getTime();
    const timestamp = gpsTime - startTime;
    const secondsFromStart = timestamp / 1000; // Keep as float for better matching

    // Try to find matching time sample (within 5 seconds)
    let matchedSample: typeof timeSamples[0] | undefined;
    for (let offset = -5; offset <= 5; offset++) {
      matchedSample = sampleMap.get(Math.floor(secondsFromStart) + offset);
      if (matchedSample) break;
    }

    // Find closest HR value using binary search
    const matchedHr = findClosestHr(secondsFromStart);

    const point: ActivityDataPoint = {
      timestamp,
      lat: gps.lat,
      lon: gps.lon,
      elevation: gps.altitude || matchedSample?.altitude,
      speed: matchedSample?.speed,
      hr: matchedSample?.hr || matchedHr,
      cadence: matchedSample?.cadence,
      distance: distances[i],
      temperature: matchedSample?.temperature,
    };

    // Calculate speed from distance/time if not available from sample
    if (point.speed === undefined && i > 0) {
      const prevPoint = dataPoints[i - 1];
      const timeDiff = (timestamp - prevPoint.timestamp) / 1000;
      if (timeDiff > 0) {
        const distDiff = distances[i] - distances[i - 1];
        point.speed = distDiff / timeDiff;
      }
    }

    // Calculate grade from previous point
    if (i > 0 && dataPoints[i - 1].elevation !== undefined && point.elevation !== undefined) {
      const distDiff = distances[i] - distances[i - 1];
      if (distDiff > 0) {
        point.grade = calculateGrade(dataPoints[i - 1].elevation, point.elevation, distDiff);
      }
    }

    point.isMoving = isMoving(point.speed);
    dataPoints.push(point);
  }

  // Smooth elevation
  smoothElevation(dataPoints);

  // Calculate bounds
  const lats = dataPoints.map(p => p.lat);
  const lons = dataPoints.map(p => p.lon);

  // Calculate summary
  let elevationGain = 0;
  let elevationLoss = 0;
  for (let i = 1; i < dataPoints.length; i++) {
    const prev = dataPoints[i - 1].elevation;
    const curr = dataPoints[i].elevation;
    if (prev !== undefined && curr !== undefined) {
      const diff = curr - prev;
      if (diff > 0) elevationGain += diff;
      else elevationLoss += Math.abs(diff);
    }
  }

  const speeds = dataPoints.map(p => p.speed).filter((s): s is number => s !== undefined);
  const hrs = dataPoints.map(p => p.hr).filter((h): h is number => h !== undefined);
  const cadences = dataPoints.map(p => p.cadence).filter((c): c is number => c !== undefined);

  return {
    source: "suunto",
    summary: {
      startTime: suuntoData.dateTime,
      duration: suuntoData.durationSeconds,
      distance: suuntoData.distanceMeters,
      elevationGain,
      elevationLoss,
      avgSpeed: speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
      maxSpeed: speeds.length ? Math.max(...speeds) : 0,
      avgHr: hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : undefined,
      maxHr: hrs.length ? Math.max(...hrs) : undefined,
      minHr: hrs.length ? Math.min(...hrs) : undefined,
      avgCadence: cadences.length ? Math.round(cadences.reduce((a, b) => a + b, 0) / cadences.length) : undefined,
      calories: suuntoData.caloriesBurned,
    },
    dataPoints,
    hasHeartRate: hrs.length > 0,
    hasCadence: cadences.length > 0,
    hasSpeed: speeds.length > 0,
    bounds: {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lons),
      west: Math.min(...lons),
    },
  };
}

// ============================================================================
// GPX Parser
// ============================================================================

function parseGpxActivity(gpxResult: GpxParseResult): ActivityData {
  const trackPoints = gpxResult.trackPoints;

  if (!trackPoints.length) {
    throw new Error("No track points found in GPX file");
  }

  // Check if we have timestamps
  const hasTimestamps = trackPoints.every(p => p.time);

  let startTime = 0;
  if (hasTimestamps && trackPoints[0].time) {
    startTime = new Date(trackPoints[0].time).getTime();
  }

  const distances = calculateCumulativeDistance(trackPoints);
  const dataPoints: ActivityDataPoint[] = [];

  for (let i = 0; i < trackPoints.length; i++) {
    const tp = trackPoints[i];

    let timestamp = 0;
    if (hasTimestamps && tp.time) {
      timestamp = new Date(tp.time).getTime() - startTime;
    } else {
      // Estimate time based on distance (assume 3 mph average)
      timestamp = (distances[i] / 1.34) * 1000; // 1.34 m/s = 3 mph
    }

    const point: ActivityDataPoint = {
      timestamp,
      lat: tp.lat,
      lon: tp.lon,
      elevation: tp.ele,
      distance: distances[i],
    };

    // Calculate speed from previous point if timestamps exist
    if (i > 0 && hasTimestamps) {
      point.speed = calculateSpeed(
        { ...dataPoints[i - 1], timestamp: dataPoints[i - 1].timestamp },
        { lat: tp.lat, lon: tp.lon, timestamp }
      );
    }

    // Calculate grade
    if (i > 0 && dataPoints[i - 1].elevation !== undefined && point.elevation !== undefined) {
      const distDiff = distances[i] - distances[i - 1];
      if (distDiff > 0) {
        point.grade = calculateGrade(dataPoints[i - 1].elevation, point.elevation, distDiff);
      }
    }

    point.isMoving = isMoving(point.speed);
    dataPoints.push(point);
  }

  // Smooth elevation
  smoothElevation(dataPoints);

  // Calculate bounds
  const lats = dataPoints.map(p => p.lat);
  const lons = dataPoints.map(p => p.lon);

  // Calculate elevation stats
  let elevationGain = 0;
  let elevationLoss = 0;
  for (let i = 1; i < dataPoints.length; i++) {
    const prev = dataPoints[i - 1].elevation;
    const curr = dataPoints[i].elevation;
    if (prev !== undefined && curr !== undefined) {
      const diff = curr - prev;
      if (diff > 0) elevationGain += diff;
      else elevationLoss += Math.abs(diff);
    }
  }

  const speeds = dataPoints.map(p => p.speed).filter((s): s is number => s !== undefined);
  const duration = hasTimestamps
    ? dataPoints[dataPoints.length - 1].timestamp / 1000
    : distances[distances.length - 1] / 1.34;

  return {
    source: "gpx",
    summary: {
      startTime: gpxResult.startTime || new Date().toISOString(),
      duration,
      distance: distances[distances.length - 1],
      elevationGain,
      elevationLoss,
      avgSpeed: speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 1.34,
      maxSpeed: speeds.length ? Math.max(...speeds) : 1.34,
    },
    dataPoints,
    hasHeartRate: false,
    hasCadence: false,
    hasSpeed: speeds.length > 0,
    bounds: {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lons),
      west: Math.min(...lons),
    },
  };
}

// ============================================================================
// Main Parser with Auto-Detection
// ============================================================================

export type ActivityDataSource =
  | { type: "suunto"; data: string | SuuntoParseResult }
  | { type: "gpx"; data: string | GpxParseResult }
  | { type: "auto"; suuntoData?: string; gpxData?: string };

/**
 * Parse activity data with auto-detection of source format
 * Prioritizes Suunto data if both are available (has more metrics)
 * Handles both raw Suunto JSON and pre-parsed SuuntoParseResult formats
 */
export function parseActivityData(source: ActivityDataSource): ActivityData {
  if (source.type === "suunto") {
    const parsed = typeof source.data === "string"
      ? parseSuuntoJson(source.data)
      : source.data;
    return parseSuuntoActivity(parsed);
  }

  if (source.type === "gpx") {
    const parsed = typeof source.data === "string"
      ? parseGpx(source.data)
      : source.data;
    return parseGpxActivity(parsed);
  }

  // Auto-detect: prefer Suunto if available (has more data)
  if (source.suuntoData) {
    try {
      const data = JSON.parse(source.suuntoData);

      // Check if this is already a parsed SuuntoParseResult (has gpsTrack array directly)
      if (data.gpsTrack && Array.isArray(data.gpsTrack) && data.gpsTrack.length > 0) {
        // It's pre-parsed data, use it directly
        return parseSuuntoActivity(data);
      }

      // Otherwise try parsing as raw Suunto JSON
      const parsed = parseSuuntoJson(source.suuntoData);
      if (parsed.gpsTrack.length > 0) {
        return parseSuuntoActivity(parsed);
      }
    } catch (e) {
      console.warn("Failed to parse Suunto data, falling back to GPX", e);
    }
  }

  if (source.gpxData) {
    try {
      const parsed = parseGpx(source.gpxData);
      return parseGpxActivity(parsed);
    } catch (e) {
      console.warn("Failed to parse GPX data", e);
    }
  }

  throw new Error("No valid activity data found");
}

/**
 * Check if entry has playable activity data
 * Handles both raw Suunto JSON and pre-parsed SuuntoParseResult formats
 */
export function hasActivityData(entry: {
  suuntoData?: string | null;
  gpxData?: string | null;
}): boolean {
  if (entry.suuntoData) {
    try {
      const data = JSON.parse(entry.suuntoData);

      // Check if this is a pre-parsed SuuntoParseResult (has gpsTrack array directly)
      if (data.gpsTrack && Array.isArray(data.gpsTrack)) {
        return data.gpsTrack.length > 0;
      }

      // Otherwise try parsing as raw Suunto JSON
      const parsed = parseSuuntoJson(entry.suuntoData);
      return parsed.gpsTrack.length > 0;
    } catch {
      // Suunto data invalid, check GPX
    }
  }

  if (entry.gpxData) {
    try {
      const parsed = parseGpx(entry.gpxData);
      return parsed.trackPoints.length > 0;
    } catch {
      return false;
    }
  }

  return false;
}

// ============================================================================
// Utility Exports
// ============================================================================

export { metersToMiles, msToMph, metersToFeet };

/**
 * Format duration as HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Format speed as pace (min/mile) or mph
 */
export function formatSpeed(metersPerSecond: number, asPace: boolean = false): string {
  const mph = msToMph(metersPerSecond);

  if (asPace && mph > 0) {
    const minPerMile = 60 / mph;
    const mins = Math.floor(minPerMile);
    const secs = Math.round((minPerMile - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, "0")} /mi`;
  }

  return `${mph.toFixed(1)} mph`;
}

/**
 * Get color for value on a gradient scale
 */
export function getGradientColor(
  value: number,
  min: number,
  max: number,
  colorScale: "speed" | "hr" | "elevation" = "speed"
): string {
  // Handle invalid values - return a default gray
  if (value === undefined || value === null || isNaN(value)) {
    return "rgb(128, 128, 128)";
  }

  // Clamp ratio between 0 and 1
  let ratio = max === min ? 0.5 : (value - min) / (max - min);
  ratio = Math.max(0, Math.min(1, ratio));

  // Color scales
  const scales = {
    speed: [
      { r: 0, g: 100, b: 255 },    // Blue (slow)
      { r: 0, g: 255, b: 100 },    // Green
      { r: 255, g: 255, b: 0 },    // Yellow
      { r: 255, g: 100, b: 0 },    // Orange (fast)
    ],
    hr: [
      { r: 0, g: 200, b: 100 },    // Green (low)
      { r: 255, g: 255, b: 0 },    // Yellow
      { r: 255, g: 150, b: 0 },    // Orange
      { r: 255, g: 50, b: 50 },    // Red (high)
    ],
    elevation: [
      { r: 0, g: 150, b: 0 },      // Dark green (low)
      { r: 100, g: 200, b: 100 },  // Light green
      { r: 150, g: 100, b: 50 },   // Brown
      { r: 255, g: 255, b: 255 },  // White (high)
    ],
  };

  const scale = scales[colorScale];
  const segment = ratio * (scale.length - 1);
  const index = Math.floor(segment);
  const segmentRatio = segment - index;

  const c1 = scale[Math.min(index, scale.length - 1)];
  const c2 = scale[Math.min(index + 1, scale.length - 1)];

  const r = Math.round(c1.r + (c2.r - c1.r) * segmentRatio);
  const g = Math.round(c1.g + (c2.g - c1.g) * segmentRatio);
  const b = Math.round(c1.b + (c2.b - c1.b) * segmentRatio);

  return `rgb(${r}, ${g}, ${b})`;
}
