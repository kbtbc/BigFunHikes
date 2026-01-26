import { useState, useEffect, useCallback } from "react";

interface IndexedTrailData {
  name: string;
  totalPoints: number;
  indexedPoints: number;
  bounds: { south: number; north: number; west: number; east: number };
  coordinates: number[]; // flat array [lat1, lng1, lat2, lng2, ...]
  indices: number[]; // original trail indices for ordering
}

interface DynamicSegment {
  coordinates: [number, number][];
  bounds: { south: number; north: number; west: number; east: number };
}

// Cache for the indexed trail data
let cachedTrailData: IndexedTrailData | null = null;
let loadingPromise: Promise<IndexedTrailData | null> | null = null;

// Haversine distance in km
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find the closest point on the trail to given coordinates
function findClosestPointIndex(
  trailData: IndexedTrailData,
  targetLat: number,
  targetLng: number
): number {
  let closestIndex = 0;
  let closestDistance = Infinity;

  const coordCount = trailData.coordinates.length / 2;

  for (let i = 0; i < coordCount; i++) {
    const lat = trailData.coordinates[i * 2];
    const lng = trailData.coordinates[i * 2 + 1];
    const distance = haversineDistance(targetLat, targetLng, lat, lng);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = i;
    }
  }

  return closestIndex;
}

// Extract a segment between two trail indices
function extractSegment(
  trailData: IndexedTrailData,
  startIndex: number,
  endIndex: number
): DynamicSegment {
  // Ensure start is before end (trail goes south to north)
  const [fromIdx, toIdx] =
    startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];

  const coordinates: [number, number][] = [];
  const lats: number[] = [];
  const lngs: number[] = [];

  for (let i = fromIdx; i <= toIdx; i++) {
    const lat = trailData.coordinates[i * 2];
    const lng = trailData.coordinates[i * 2 + 1];
    coordinates.push([lat, lng]);
    lats.push(lat);
    lngs.push(lng);
  }

  // If we got very few points, add some buffer
  if (coordinates.length < 5) {
    // Expand the range a bit
    const expandedFrom = Math.max(0, fromIdx - 5);
    const expandedTo = Math.min(trailData.coordinates.length / 2 - 1, toIdx + 5);

    coordinates.length = 0;
    lats.length = 0;
    lngs.length = 0;

    for (let i = expandedFrom; i <= expandedTo; i++) {
      const lat = trailData.coordinates[i * 2];
      const lng = trailData.coordinates[i * 2 + 1];
      coordinates.push([lat, lng]);
      lats.push(lat);
      lngs.push(lng);
    }
  }

  return {
    coordinates,
    bounds: {
      south: Math.min(...lats),
      north: Math.max(...lats),
      west: Math.min(...lngs),
      east: Math.max(...lngs),
    },
  };
}

// Load the indexed trail data (with caching)
async function loadTrailData(): Promise<IndexedTrailData | null> {
  if (cachedTrailData) return cachedTrailData;

  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch("/data/at-trail-indexed.json")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load trail index");
      return res.json();
    })
    .then((data) => {
      cachedTrailData = data;
      return data;
    })
    .catch((err) => {
      console.error("Error loading trail index:", err);
      return null;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

/**
 * Hook to dynamically calculate a trail segment between two points
 * Uses the entry's coordinates to find the closest points on the AT
 */
export function useDynamicTrailSegment(
  startLat: number | null,
  startLng: number | null,
  endLat: number | null,
  endLng: number | null
) {
  const [segment, setSegment] = useState<DynamicSegment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateSegment = useCallback(async () => {
    // Need at least start coordinates
    if (startLat === null || startLng === null) {
      setSegment(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const trailData = await loadTrailData();
      if (!trailData) {
        throw new Error("Could not load trail data");
      }

      // Find closest point to start
      const startIndex = findClosestPointIndex(trailData, startLat, startLng);

      // If we have end coordinates, find that too
      let endIndex = startIndex;
      if (endLat !== null && endLng !== null) {
        endIndex = findClosestPointIndex(trailData, endLat, endLng);
      } else {
        // If no end point, show a small segment around the start (about 10 trail points)
        endIndex = Math.min(
          startIndex + 10,
          trailData.coordinates.length / 2 - 1
        );
      }

      const newSegment = extractSegment(trailData, startIndex, endIndex);
      setSegment(newSegment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSegment(null);
    } finally {
      setLoading(false);
    }
  }, [startLat, startLng, endLat, endLng]);

  useEffect(() => {
    calculateSegment();
  }, [calculateSegment]);

  return {
    segment,
    coordinates: segment?.coordinates ?? [],
    bounds: segment?.bounds ?? null,
    loading,
    error,
  };
}

/**
 * Hook for single-point segment (shows trail around the entry location)
 */
export function useTrailSegmentForEntry(
  latitude: number | null,
  longitude: number | null,
  prevLatitude?: number | null,
  prevLongitude?: number | null
) {
  return useDynamicTrailSegment(
    prevLatitude ?? latitude,
    prevLongitude ?? longitude,
    latitude,
    longitude
  );
}

// Preload trail data for faster subsequent lookups
export function preloadTrailIndex() {
  return loadTrailData();
}
