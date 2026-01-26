/**
 * Suunto JSON Parser - Backend Version
 * Parses Suunto watch export files for seeding and API use
 */

// Raw Suunto JSON types
interface SuuntoRawHeader {
  ActivityType: number;
  DateTime: string;
  Distance: number;
  Duration: number;
  Ascent: number;
  AscentTime: number;
  Descent: number;
  DescentTime: number;
  Altitude: { Min: number; Max: number };
  StepCount: number;
  Energy: number;
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
  Temperature: { Min: number; Max: number };
  Personal?: { MaxHR?: number };
  PeakTrainingEffect?: number;
  RecoveryTime?: number;
  EPOC?: number;
  Feeling?: number;
}

interface SuuntoRawSample {
  TimeISO8601: string;
  HR?: number;
  Latitude?: number;
  Longitude?: number;
  GPSAltitude?: number;
  Speed?: number;
  Cadence?: number;
  Temperature?: number;
  Altitude?: number;
  Distance?: number;
  VerticalSpeed?: number;
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
  Temperature?: Array<{ Avg: number; Max: number; Min: number }>;
}

interface SuuntoRawData {
  DeviceLog: {
    Header: SuuntoRawHeader;
    Samples: SuuntoRawSample[];
  };
}

// Exported types
export interface SuuntoHeartRateStats {
  avgBpm: number;
  maxBpm: number;
  minBpm: number;
  zones: {
    zone1: { duration: number; percentage: number };
    zone2: { duration: number; percentage: number; lowerLimit: number };
    zone3: { duration: number; percentage: number; lowerLimit: number };
    zone4: { duration: number; percentage: number; lowerLimit: number };
    zone5: { duration: number; percentage: number; lowerLimit: number };
  };
}

export interface SuuntoPaceStats {
  avgPaceMinPerMile: number;
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
  lat: number;
  lon: number;
  altitude: number;
  timestamp: string;
}

export interface SuuntoParseResult {
  dateTime: string;
  activityType: number;
  durationSeconds: number;
  durationFormatted: string;
  distanceMeters: number;
  distanceMiles: number;
  stepCount: number;
  caloriesBurned: number;
  stepsPerMile: number;
  heartRate: SuuntoHeartRateStats;
  pace: SuuntoPaceStats;
  temperature: SuuntoTemperatureStats;
  elevation: SuuntoElevationStats;
  peakTrainingEffect: number | null;
  recoveryTimeMinutes: number | null;
  epoc: number | null;
  feeling: number | null;
  laps: SuuntoLap[];
  gpsTrack: SuuntoGpsPoint[];
  elevationProfile: Array<{ distance: number; altitude: number }>;
  hrOverTime: Array<{ time: number; hr: number }>;
}

// Conversion helpers
const hzToBpm = (hz: number): number => Math.round(hz * 60);
const kelvinToCelsius = (k: number): number => k - 273.15;
const celsiusToFahrenheit = (c: number): number => (c * 9) / 5 + 32;
const metersToMiles = (m: number): number => m * 0.000621371;
const metersToFeet = (m: number): number => m * 3.28084;
const msToMph = (ms: number): number => ms * 2.23694;
const radiansToDecimal = (rad: number): number => (rad * 180) / Math.PI;
const joulesToCalories = (j: number): number => Math.round(j / 4184);

const speedToPaceMinPerMile = (speedMs: number): number => {
  if (speedMs <= 0) return 0;
  return 60 / msToMph(speedMs);
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  return `${minutes}m ${secs}s`;
};

export function parseSuuntoJson(jsonContent: string | object): SuuntoParseResult {
  const data: SuuntoRawData = typeof jsonContent === 'string'
    ? JSON.parse(jsonContent)
    : jsonContent;

  const header = data.DeviceLog.Header;
  const samples = data.DeviceLog.Samples;
  const startTime = new Date(header.DateTime).getTime();

  // Basic stats
  const durationSeconds = header.Duration;
  const distanceMeters = header.Distance;
  const distanceMiles = metersToMiles(distanceMeters);
  const stepCount = header.StepCount;
  const caloriesBurned = joulesToCalories(header.Energy);
  const stepsPerMile = distanceMiles > 0 ? Math.round(stepCount / distanceMiles) : 0;

  // HR stats
  const hrZones = header.HrZones;
  const totalHrTime = hrZones.Zone1Duration + hrZones.Zone2Duration + hrZones.Zone3Duration + hrZones.Zone4Duration + hrZones.Zone5Duration;
  const hrSamples = samples.filter(s => s.HR !== undefined).map(s => hzToBpm(s.HR!));
  const avgHr = hrSamples.length > 0 ? Math.round(hrSamples.reduce((a, b) => a + b, 0) / hrSamples.length) : 0;
  const maxHr = hrSamples.length > 0 ? Math.max(...hrSamples) : 0;
  const minHr = hrSamples.length > 0 ? Math.min(...hrSamples) : 0;

  const heartRate: SuuntoHeartRateStats = {
    avgBpm: avgHr,
    maxBpm: maxHr,
    minBpm: minHr,
    zones: {
      zone1: { duration: hrZones.Zone1Duration, percentage: totalHrTime > 0 ? (hrZones.Zone1Duration / totalHrTime) * 100 : 0 },
      zone2: { duration: hrZones.Zone2Duration, percentage: totalHrTime > 0 ? (hrZones.Zone2Duration / totalHrTime) * 100 : 0, lowerLimit: hzToBpm(hrZones.Zone2LowerLimit) },
      zone3: { duration: hrZones.Zone3Duration, percentage: totalHrTime > 0 ? (hrZones.Zone3Duration / totalHrTime) * 100 : 0, lowerLimit: hzToBpm(hrZones.Zone3LowerLimit) },
      zone4: { duration: hrZones.Zone4Duration, percentage: totalHrTime > 0 ? (hrZones.Zone4Duration / totalHrTime) * 100 : 0, lowerLimit: hzToBpm(hrZones.Zone4LowerLimit) },
      zone5: { duration: hrZones.Zone5Duration, percentage: totalHrTime > 0 ? (hrZones.Zone5Duration / totalHrTime) * 100 : 0, lowerLimit: hzToBpm(hrZones.Zone5LowerLimit) },
    },
  };

  // Pace stats
  const speedSamples = samples.filter(s => s.Speed !== undefined && s.Speed > 0).map(s => s.Speed!);
  const avgSpeed = speedSamples.length > 0 ? speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length : 0;
  const maxSpeed = speedSamples.length > 0 ? Math.max(...speedSamples) : 0;

  const pace: SuuntoPaceStats = {
    avgPaceMinPerMile: speedToPaceMinPerMile(avgSpeed),
    avgSpeedMph: msToMph(avgSpeed),
    maxSpeedMph: msToMph(maxSpeed),
    movingTimeSeconds: durationSeconds,
    ascentTimeSeconds: header.AscentTime,
    descentTimeSeconds: header.DescentTime,
  };

  // Temperature stats
  const tempSamples = samples.filter(s => s.Temperature !== undefined).map(s => kelvinToCelsius(s.Temperature!));
  const avgTemp = tempSamples.length > 0 ? tempSamples.reduce((a, b) => a + b, 0) / tempSamples.length : kelvinToCelsius((header.Temperature.Min + header.Temperature.Max) / 2);
  const minTemp = header.Temperature.Min ? kelvinToCelsius(header.Temperature.Min) : (tempSamples.length > 0 ? Math.min(...tempSamples) : 0);
  const maxTemp = header.Temperature.Max ? kelvinToCelsius(header.Temperature.Max) : (tempSamples.length > 0 ? Math.max(...tempSamples) : 0);

  const temperature: SuuntoTemperatureStats = {
    avgCelsius: Math.round(avgTemp * 10) / 10,
    minCelsius: Math.round(minTemp * 10) / 10,
    maxCelsius: Math.round(maxTemp * 10) / 10,
    avgFahrenheit: Math.round(celsiusToFahrenheit(avgTemp)),
    minFahrenheit: Math.round(celsiusToFahrenheit(minTemp)),
    maxFahrenheit: Math.round(celsiusToFahrenheit(maxTemp)),
  };

  // Elevation stats
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

  // Laps
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
        avgTempCelsius: lap.Temperature?.[0]?.Avg ? Math.round(kelvinToCelsius(lap.Temperature[0].Avg) * 10) / 10 : null,
        calories: joulesToCalories(lap.Energy),
      });
    }
  }

  // GPS Track (sampled for storage)
  const gpsTrack: SuuntoGpsPoint[] = [];
  let gpsCount = 0;
  for (const sample of samples) {
    if (sample.Latitude !== undefined && sample.Longitude !== undefined) {
      if (gpsCount % 10 === 0) { // Sample every 10th point
        gpsTrack.push({
          lat: radiansToDecimal(sample.Latitude),
          lon: radiansToDecimal(sample.Longitude),
          altitude: sample.GPSAltitude ?? 0,
          timestamp: sample.TimeISO8601,
        });
      }
      gpsCount++;
    }
  }

  // Elevation profile
  const elevationProfile: Array<{ distance: number; altitude: number }> = [];
  let lastDistance = -100;
  for (const sample of samples) {
    if (sample.Distance !== undefined && sample.Altitude !== undefined) {
      if (sample.Distance - lastDistance >= 100) {
        elevationProfile.push({ distance: sample.Distance, altitude: sample.Altitude });
        lastDistance = sample.Distance;
      }
    }
  }

  // HR over time
  const hrOverTime: Array<{ time: number; hr: number }> = [];
  let lastHrTime = 0;
  for (const sample of samples) {
    if (sample.HR !== undefined) {
      const sampleTime = new Date(sample.TimeISO8601).getTime();
      const secondsFromStart = (sampleTime - startTime) / 1000;
      if (secondsFromStart - lastHrTime >= 30) {
        hrOverTime.push({ time: secondsFromStart, hr: hzToBpm(sample.HR) });
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
    elevationProfile,
    hrOverTime,
  };
}
