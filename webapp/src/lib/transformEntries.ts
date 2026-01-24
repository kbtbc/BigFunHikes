import type { JournalEntry as ApiJournalEntry, WeatherData } from "@/lib/api";
import type { JournalEntry as ComponentJournalEntry, WeatherInfo } from "@/data/journalEntries";

const TOTAL_AT_MILES = 2190;

/**
 * Transform API journal entry format to component format
 */
export function transformApiEntryToComponent(
  apiEntry: ApiJournalEntry
): ComponentJournalEntry {
  // Parse GPX data if available to extract track points
  let gpxTrack: Array<[number, number]> | undefined;
  if (apiEntry.gpxData) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(apiEntry.gpxData, "text/xml");
      const trkpts = xmlDoc.querySelectorAll("trkpt");
      if (trkpts.length > 0) {
        gpxTrack = Array.from(trkpts).map((pt) => {
          const lat = parseFloat(pt.getAttribute("lat") || "0");
          const lon = parseFloat(pt.getAttribute("lon") || "0");
          return [lat, lon] as [number, number];
        });
      }
    } catch (e) {
      console.warn("Failed to parse GPX data:", e);
    }
  }

  // Default coordinates (Springer Mountain, GA - AT southern terminus)
  const defaultCoords: [number, number] = [34.6266, -84.1934];

  // Determine start and end coordinates
  // Priority: 1. Direct lat/lon from entry, 2. GPX track, 3. Default
  let startCoords: [number, number];
  let endCoords: [number, number];

  if (apiEntry.latitude !== null && apiEntry.longitude !== null) {
    // Use direct coordinates from entry
    startCoords = [apiEntry.latitude, apiEntry.longitude];
    endCoords = [apiEntry.latitude, apiEntry.longitude];
  } else if (gpxTrack && gpxTrack.length > 0) {
    // Fall back to GPX track
    startCoords = gpxTrack[0];
    endCoords = gpxTrack[gpxTrack.length - 1];
  } else {
    // Default location
    startCoords = defaultCoords;
    endCoords = defaultCoords;
  }

  // Transform photos
  const photos = (apiEntry.photos || []).map((photo) => ({
    url: photo.url,
    caption: photo.caption || "",
  }));

  // Location name - use stored name or default
  const locationName = apiEntry.locationName || "Appalachian Trail";

  // Parse weather data if available
  let weather: WeatherInfo | undefined;
  if (apiEntry.weather) {
    try {
      const parsed = JSON.parse(apiEntry.weather) as WeatherData;
      weather = {
        temperature: parsed.temperature,
        temperatureUnit: parsed.temperatureUnit,
        conditions: parsed.conditions,
        weatherCode: parsed.weatherCode,
        humidity: parsed.humidity,
        windSpeed: parsed.windSpeed,
        windUnit: parsed.windUnit,
        recordedAt: parsed.recordedAt,
      };
    } catch (e) {
      console.warn("Failed to parse weather data:", e);
    }
  }

  return {
    id: apiEntry.id,
    day: apiEntry.dayNumber,
    date: apiEntry.date,
    createdAt: apiEntry.createdAt,
    title: apiEntry.title,
    content: apiEntry.content,
    miles: apiEntry.milesHiked,
    elevationGain: apiEntry.elevationGain || 0,
    totalMiles: apiEntry.totalMilesCompleted,
    location: {
      start: locationName,
      end: locationName,
    },
    coordinates: {
      start: startCoords,
      end: endCoords,
    },
    photos,
    gpxTrack,
    weather,
    locationName: apiEntry.locationName || undefined,
  };
}

/**
 * Transform API stats format to component format
 */
export function transformApiStatsToComponent(apiStats: {
  totalMiles: number;
  totalDays: number;
  totalElevationGain: number;
  averageMilesPerDay: number;
  lastEntryDate: string | null;
}) {
  return {
    totalMiles: TOTAL_AT_MILES,
    milesCompleted: apiStats.totalMiles,
    daysOnTrail: apiStats.totalDays,
    averageDailyMiles: apiStats.averageMilesPerDay,
    totalElevationGain: apiStats.totalElevationGain,
  };
}
