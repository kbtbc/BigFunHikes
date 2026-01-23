import type { JournalEntry as ApiJournalEntry } from "@/lib/api";
import type { JournalEntry as ComponentJournalEntry } from "@/data/journalEntries";

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
  // If we have GPX track, use first and last points
  // Otherwise use default location
  let startCoords: [number, number];
  let endCoords: [number, number];

  if (gpxTrack && gpxTrack.length > 0) {
    startCoords = gpxTrack[0];
    endCoords = gpxTrack[gpxTrack.length - 1];
  } else {
    startCoords = defaultCoords;
    endCoords = defaultCoords;
  }

  // Transform photos
  const photos = (apiEntry.photos || []).map((photo) => ({
    url: photo.url,
    caption: photo.caption || "",
  }));

  // Generic location name since we don't store location names
  const locationName = "Appalachian Trail";

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
