/**
 * Suunto JSON Parser Utility
 * Parses Suunto watch export files and extracts comprehensive fitness data
 * including heart rate, pace, steps, temperature, laps, and GPS coordinates
 */

// ============================================================================
// Types for raw Suunto JSON structure
// ============================================================================

interface SuuntoRawHeader {
  ActivityType: number;
  DateTime: string;
  Distance: number; // meters
  Duration: number; // seconds
  Ascent: number; // meters
  AscentTime: number; // seconds
  Descent: number; // meters
  DescentTime: number; // seconds
  Altitude: { Min: number; Max: number };
  StepCount: number;
  Energy: number; // joules
  HrZones: {
    Zone1Duration: number;
    Zone2Duration: number;
    Zone2LowerLimit: number;
    Zone3Duration: number;
    Zone3LowerLimit: number;
    Zone4Duration: number;
    Zone4LowerLimit: number;
    Zone5Duration: number;
    Zone5LowerLimit: number;
  };
  Temperature: { Min: number; Max: number }; // Kelvin
  Personal?: { MaxHR?: number };
  PeakTrainingEffect?: number;
  RecoveryTime?: number;
  EPOC?: number;
  Feeling?: number;
}

interface SuuntoRawSample {
  TimeISO8601: string;
  HR?: number; // Hz (beats per second)
  Latitude?: number; // radians
  Longitude?: number; // radians
  GPSAltitude?: number; // meters
  Speed?: number; // m/s
  Cadence?: number; // steps/second
  Temperature?: number; // Kelvin
  Altitude?: number; // meters
  Distance?: number; // meters
  VerticalSpeed?: number; // m/s
  AbsPressure?: number; // Pa
  SeaLevelPressure?: number; // Pa
  Events?: Array<{ Lap?: { Type: string } }>;
  Window?: SuuntoRawLap;
}

interface SuuntoRawLap {
  Type: string;
  Duration: number;
  Distance: number;
  Ascent: number;
  Descent: number;
  Energy: number;
  HR?: Array<{ Avg: number; Max: number; Min: number }>;
  Speed?: Array<{ Avg: number; Max: number; Min: number }>;
  Cadence?: Array<{ Avg: number; Max: number; Min: number }>;
  Temperature?: Array<{ Avg: number; Max: number; Min: number }>;
  Altitude?: Array<{ Avg: number; Max: number; Min: number }>;
  VerticalSpeed?: Array<{ Avg: number; Max: number; Min: number }>;
}

interface SuuntoRawData {
  DeviceLog: {
    Header: SuuntoRawHeader;
    Samples: SuuntoRawSample[];
  };
}

// ============================================================================
// Parsed/Cleaned Types (exported for use in components)
// ============================================================================

export interface SuuntoHeartRateStats {
  avgBpm: number;
  maxBpm: number;
  minBpm: number;
  zones: {
    zone1: { duration: number; percentage: number }; // Recovery
    zone2: { duration: number; percentage: number; lowerLimit: number }; // Easy
    zone3: { duration: number; percentage: number; lowerLimit: number }; // Aerobic
    zone4: { duration: number; percentage: number; lowerLimit: number }; // Threshold
    zone5: { duration: number; percentage: number; lowerLimit: number }; // Max
  };
}

export interface SuuntoPaceStats {
  avgPaceMinPerMile: number; // minutes per mile
  avgSpeedMph: number;
  maxSpeedMph: number;
  movingTimeSeconds: number;
  ascentTimeSeconds: number;
  descentTimeSeconds: number;
}

export interface SuuntoTemperatureStats {
  avgCelsius: number;
  minCelsius: number;
  maxCelsius: number;
  avgFahrenheit: number;
  minFahrenheit: number;
  maxFahrenheit: number;
}

export interface SuuntoElevationStats {
  ascentMeters: number;
  descentMeters: number;
  ascentFeet: number;
  descentFeet: number;
  minAltitudeMeters: number;
  maxAltitudeMeters: number;
  minAltitudeFeet: number;
  maxAltitudeFeet: number;
}

export interface SuuntoLap {
  lapNumber: number;
  timestamp: string;
  durationSeconds: number;
  distanceMeters: number;
  distanceMiles: number;
  paceMinPerMile: number;
  ascentMeters: number;
  descentMeters: number;
  avgHrBpm: number | null;
  maxHrBpm: number | null;
  avgSpeedMph: number | null;
  avgTempCelsius: number | null;
  calories: number;
}

export interface SuuntoGpsPoint {
  lat: number; // degrees
  lon: number; // degrees
  altitude: number; // meters
  timestamp: string;
}

export interface SuuntoTimeSample {
  timestamp: string;
  secondsFromStart: number;
  hr?: number; // BPM
  altitude?: number; // meters
  speed?: number; // m/s
  cadence?: number; // steps/min
  temperature?: number; // Celsius
  distance?: number; // meters
}

export interface SuuntoParseResult {
  // Summary stats
  dateTime: string;
  activityType: number;
  durationSeconds: number;
  durationFormatted: string;
  distanceMeters: number;
  distanceMiles: number;
  stepCount: number;
  caloriesBurned: number;
  stepsPerMile: number;

  // Detailed stats
  heartRate: SuuntoHeartRateStats;
  pace: SuuntoPaceStats;
  temperature: SuuntoTemperatureStats;
  elevation: SuuntoElevationStats;

  // Training metrics
  peakTrainingEffect: number | null;
  recoveryTimeMinutes: number | null;
  epoc: number | null;
  feeling: number | null;

  // Time series data (for charts)
  laps: SuuntoLap[];
  gpsTrack: SuuntoGpsPoint[];
  timeSamples: SuuntoTimeSample[];

  // Elevation profile data
  elevationProfile: Array<{ distance: number; altitude: number }>;
  hrOverTime: Array<{ time: number; hr: number }>;
}

// ============================================================================
// Conversion Helpers
// ============================================================================

function hzToBpm(hz: number): number {
  return Math.round(hz * 60);
}

function kelvinToCelsius(k: number): number {
  return k - 273.15;
}

function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

function metersToMiles(m: number): number {
  return m * 0.000621371;
}

function metersToFeet(m: number): number {
  return m * 3.28084;
}

function msToMph(ms: number): number {
  return ms * 2.23694;
}

function speedToPaceMinPerMile(speedMs: number): number {
  if (speedMs <= 0) return 0;
  const mph = msToMph(speedMs);
  return 60 / mph; // minutes per mile
}

function radiansToDecimal(rad: number): number {
  return (rad * 180) / Math.PI;
}

function joulesToCalories(j: number): number {
  return Math.round(j / 4184);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}

function formatPace(minPerMile: number): string {
  const mins = Math.floor(minPerMile);
  const secs = Math.round((minPerMile - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// Main Parser
// ============================================================================

export function parseSuuntoJson(jsonContent: string | object): SuuntoParseResult {
  const data: SuuntoRawData = typeof jsonContent === 'string'
    ? JSON.parse(jsonContent)
    : jsonContent;

  const header = data.DeviceLog.Header;
  const samples = data.DeviceLog.Samples;

  // Parse start time
  const startTime = new Date(header.DateTime).getTime();

  // ---- Basic Summary Stats ----
  const durationSeconds = header.Duration;
  const distanceMeters = header.Distance;
  const distanceMiles = metersToMiles(distanceMeters);
  const stepCount = header.StepCount;
  const caloriesBurned = joulesToCalories(header.Energy);
  const stepsPerMile = distanceMiles > 0 ? Math.round(stepCount / distanceMiles) : 0;

  // ---- Heart Rate Stats ----
  const hrZones = header.HrZones;
  const totalHrTime =
    hrZones.Zone1Duration +
    hrZones.Zone2Duration +
    hrZones.Zone3Duration +
    hrZones.Zone4Duration +
    hrZones.Zone5Duration;

  // Extract HR samples to calculate avg/max/min
  const hrSamples = samples
    .filter(s => s.HR !== undefined)
    .map(s => hzToBpm(s.HR!));

  const avgHr = hrSamples.length > 0
    ? Math.round(hrSamples.reduce((a, b) => a + b, 0) / hrSamples.length)
    : 0;
  const maxHr = hrSamples.length > 0 ? Math.max(...hrSamples) : 0;
  const minHr = hrSamples.length > 0 ? Math.min(...hrSamples) : 0;

  const heartRate: SuuntoHeartRateStats = {
    avgBpm: avgHr,
    maxBpm: maxHr,
    minBpm: minHr,
    zones: {
      zone1: {
        duration: hrZones.Zone1Duration,
        percentage: totalHrTime > 0 ? (hrZones.Zone1Duration / totalHrTime) * 100 : 0,
      },
      zone2: {
        duration: hrZones.Zone2Duration,
        percentage: totalHrTime > 0 ? (hrZones.Zone2Duration / totalHrTime) * 100 : 0,
        lowerLimit: hzToBpm(hrZones.Zone2LowerLimit),
      },
      zone3: {
        duration: hrZones.Zone3Duration,
        percentage: totalHrTime > 0 ? (hrZones.Zone3Duration / totalHrTime) * 100 : 0,
        lowerLimit: hzToBpm(hrZones.Zone3LowerLimit),
      },
      zone4: {
        duration: hrZones.Zone4Duration,
        percentage: totalHrTime > 0 ? (hrZones.Zone4Duration / totalHrTime) * 100 : 0,
        lowerLimit: hzToBpm(hrZones.Zone4LowerLimit),
      },
      zone5: {
        duration: hrZones.Zone5Duration,
        percentage: totalHrTime > 0 ? (hrZones.Zone5Duration / totalHrTime) * 100 : 0,
        lowerLimit: hzToBpm(hrZones.Zone5LowerLimit),
      },
    },
  };

  // ---- Pace Stats ----
  const speedSamples = samples
    .filter(s => s.Speed !== undefined && s.Speed > 0)
    .map(s => s.Speed!);

  const avgSpeed = speedSamples.length > 0
    ? speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length
    : 0;
  const maxSpeed = speedSamples.length > 0 ? Math.max(...speedSamples) : 0;

  const pace: SuuntoPaceStats = {
    avgPaceMinPerMile: speedToPaceMinPerMile(avgSpeed),
    avgSpeedMph: msToMph(avgSpeed),
    maxSpeedMph: msToMph(maxSpeed),
    movingTimeSeconds: durationSeconds,
    ascentTimeSeconds: header.AscentTime,
    descentTimeSeconds: header.DescentTime,
  };

  // ---- Temperature Stats ----
  const tempSamples = samples
    .filter(s => s.Temperature !== undefined)
    .map(s => kelvinToCelsius(s.Temperature!));

  const avgTemp = tempSamples.length > 0
    ? tempSamples.reduce((a, b) => a + b, 0) / tempSamples.length
    : kelvinToCelsius((header.Temperature.Min + header.Temperature.Max) / 2);

  const minTemp = header.Temperature.Min
    ? kelvinToCelsius(header.Temperature.Min)
    : (tempSamples.length > 0 ? Math.min(...tempSamples) : 0);
  const maxTemp = header.Temperature.Max
    ? kelvinToCelsius(header.Temperature.Max)
    : (tempSamples.length > 0 ? Math.max(...tempSamples) : 0);

  const temperature: SuuntoTemperatureStats = {
    avgCelsius: Math.round(avgTemp * 10) / 10,
    minCelsius: Math.round(minTemp * 10) / 10,
    maxCelsius: Math.round(maxTemp * 10) / 10,
    avgFahrenheit: Math.round(celsiusToFahrenheit(avgTemp)),
    minFahrenheit: Math.round(celsiusToFahrenheit(minTemp)),
    maxFahrenheit: Math.round(celsiusToFahrenheit(maxTemp)),
  };

  // ---- Elevation Stats ----
  const elevation: SuuntoElevationStats = {
    ascentMeters: header.Ascent,
    descentMeters: header.Descent,
    ascentFeet: Math.round(metersToFeet(header.Ascent)),
    descentFeet: Math.round(metersToFeet(header.Descent)),
    minAltitudeMeters: header.Altitude.Min,
    maxAltitudeMeters: header.Altitude.Max,
    minAltitudeFeet: Math.round(metersToFeet(header.Altitude.Min)),
    maxAltitudeFeet: Math.round(metersToFeet(header.Altitude.Max)),
  };

  // ---- Laps ----
  const laps: SuuntoLap[] = [];
  let lapNumber = 1;

  for (const sample of samples) {
    if (sample.Window && sample.Window.Type === 'Lap') {
      const lap = sample.Window;
      const lapDistanceMiles = metersToMiles(lap.Distance);
      const lapAvgSpeed = lap.Speed?.[0]?.Avg ?? 0;

      laps.push({
        lapNumber: lapNumber++,
        timestamp: sample.TimeISO8601,
        durationSeconds: lap.Duration,
        distanceMeters: lap.Distance,
        distanceMiles: Math.round(lapDistanceMiles * 100) / 100,
        paceMinPerMile: speedToPaceMinPerMile(lapAvgSpeed),
        ascentMeters: lap.Ascent,
        descentMeters: lap.Descent,
        avgHrBpm: lap.HR?.[0]?.Avg ? hzToBpm(lap.HR[0].Avg) : null,
        maxHrBpm: lap.HR?.[0]?.Max ? hzToBpm(lap.HR[0].Max) : null,
        avgSpeedMph: lapAvgSpeed ? msToMph(lapAvgSpeed) : null,
        avgTempCelsius: lap.Temperature?.[0]?.Avg
          ? Math.round(kelvinToCelsius(lap.Temperature[0].Avg) * 10) / 10
          : null,
        calories: joulesToCalories(lap.Energy),
      });
    }
  }

  // ---- GPS Track ----
  const gpsTrack: SuuntoGpsPoint[] = [];
  for (const sample of samples) {
    if (sample.Latitude !== undefined && sample.Longitude !== undefined) {
      gpsTrack.push({
        lat: radiansToDecimal(sample.Latitude),
        lon: radiansToDecimal(sample.Longitude),
        altitude: sample.GPSAltitude ?? 0,
        timestamp: sample.TimeISO8601,
      });
    }
  }

  // ---- Time Series for Charts ----
  const timeSamples: SuuntoTimeSample[] = [];
  let lastSampleTime = 0;

  for (const sample of samples) {
    const sampleTime = new Date(sample.TimeISO8601).getTime();
    const secondsFromStart = (sampleTime - startTime) / 1000;

    // Only add samples every ~10 seconds to keep data manageable
    if (secondsFromStart - lastSampleTime >= 10 || timeSamples.length === 0) {
      const timeSample: SuuntoTimeSample = {
        timestamp: sample.TimeISO8601,
        secondsFromStart,
      };

      if (sample.HR !== undefined) timeSample.hr = hzToBpm(sample.HR);
      if (sample.Altitude !== undefined) timeSample.altitude = sample.Altitude;
      if (sample.Speed !== undefined) timeSample.speed = sample.Speed;
      if (sample.Cadence !== undefined) timeSample.cadence = Math.round(sample.Cadence * 60);
      if (sample.Temperature !== undefined) timeSample.temperature = kelvinToCelsius(sample.Temperature);
      if (sample.Distance !== undefined) timeSample.distance = sample.Distance;

      timeSamples.push(timeSample);
      lastSampleTime = secondsFromStart;
    }
  }

  // ---- Elevation Profile (distance vs altitude) ----
  const elevationProfile: Array<{ distance: number; altitude: number }> = [];
  let lastDistance = -100; // Start negative to capture first point

  for (const sample of samples) {
    if (sample.Distance !== undefined && sample.Altitude !== undefined) {
      // Sample every ~100 meters
      if (sample.Distance - lastDistance >= 100) {
        elevationProfile.push({
          distance: sample.Distance,
          altitude: sample.Altitude,
        });
        lastDistance = sample.Distance;
      }
    }
  }

  // ---- HR Over Time (for chart) ----
  const hrOverTime: Array<{ time: number; hr: number }> = [];
  let lastHrTime = 0;

  for (const sample of samples) {
    if (sample.HR !== undefined) {
      const sampleTime = new Date(sample.TimeISO8601).getTime();
      const secondsFromStart = (sampleTime - startTime) / 1000;

      // Sample every ~30 seconds for HR chart
      if (secondsFromStart - lastHrTime >= 30) {
        hrOverTime.push({
          time: secondsFromStart,
          hr: hzToBpm(sample.HR),
        });
        lastHrTime = secondsFromStart;
      }
    }
  }

  return {
    dateTime: header.DateTime,
    activityType: header.ActivityType,
    durationSeconds,
    durationFormatted: formatDuration(durationSeconds),
    distanceMeters,
    distanceMiles: Math.round(distanceMiles * 100) / 100,
    stepCount,
    caloriesBurned,
    stepsPerMile,
    heartRate,
    pace,
    temperature,
    elevation,
    peakTrainingEffect: header.PeakTrainingEffect ?? null,
    recoveryTimeMinutes: header.RecoveryTime ? Math.round(header.RecoveryTime / 60) : null,
    epoc: header.EPOC ?? null,
    feeling: header.Feeling ?? null,
    laps,
    gpsTrack,
    timeSamples,
    elevationProfile,
    hrOverTime,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function isValidSuuntoFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.json');
}

export function formatPaceDisplay(minPerMile: number): string {
  return formatPace(minPerMile);
}

export function formatHrZone(zone: number): string {
  const zones = ['Recovery', 'Easy', 'Aerobic', 'Threshold', 'Maximum'];
  return zones[zone - 1] || `Zone ${zone}`;
}

export function getActivityTypeName(type: number): string {
  const types: Record<number, string> = {
    1: 'Running',
    2: 'Cycling',
    3: 'Swimming',
    11: 'Walking',
    12: 'Hiking',
    13: 'Mountain Biking',
    14: 'Cross Country Skiing',
    82: 'Trail Running',
  };
  return types[type] || `Activity ${type}`;
}

/**
 * Extract simplified data for database storage
 * This keeps the full parsed data but reduces the time series for storage efficiency
 */
export function simplifyForStorage(parsed: SuuntoParseResult): SuuntoParseResult {
  return {
    ...parsed,
    // Keep only every 5th GPS point
    gpsTrack: parsed.gpsTrack.filter((_, i) => i % 5 === 0),
    // Keep only every 3rd time sample
    timeSamples: parsed.timeSamples.filter((_, i) => i % 3 === 0),
    // Keep elevation profile as-is (already sampled)
    elevationProfile: parsed.elevationProfile,
    // Keep HR over time as-is
    hrOverTime: parsed.hrOverTime,
  };
}
