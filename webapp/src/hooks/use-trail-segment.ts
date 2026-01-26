import { useState, useEffect } from "react";

interface TrailSegment {
  day: number;
  startName: string;
  endName: string;
  coordinates: number[]; // flat array [lat1, lng1, lat2, lng2, ...]
  bounds: { south: number; north: number; west: number; east: number };
}

interface TrailSegmentsData {
  generated: string;
  segmentCount: number;
  segments: Record<number, TrailSegment>;
}

let cachedData: TrailSegmentsData | null = null;

export function useTrailSegment(dayNumber: number | undefined) {
  const [segment, setSegment] = useState<TrailSegment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dayNumber === undefined) {
      setSegment(null);
      return;
    }

    const loadSegment = async () => {
      setLoading(true);
      setError(null);

      try {
        // Use cached data if available
        if (!cachedData) {
          const response = await fetch("/data/trail-segments.json");
          if (!response.ok) throw new Error("Failed to load trail segments");
          cachedData = await response.json();
        }

        const daySegment = cachedData?.segments[dayNumber];
        if (daySegment) {
          setSegment(daySegment);
        } else {
          setSegment(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setSegment(null);
      } finally {
        setLoading(false);
      }
    };

    loadSegment();
  }, [dayNumber]);

  // Convert flat coordinates to [lat, lng][] pairs
  const coordinates: [number, number][] = segment
    ? Array.from({ length: segment.coordinates.length / 2 }, (_, i) => [
        segment.coordinates[i * 2],
        segment.coordinates[i * 2 + 1],
      ])
    : [];

  return {
    segment,
    coordinates,
    bounds: segment?.bounds ?? null,
    loading,
    error,
  };
}

// Preload all segments for better UX when navigating between entries
export function preloadTrailSegments() {
  if (cachedData) return Promise.resolve(cachedData);

  return fetch("/data/trail-segments.json")
    .then((res) => res.json())
    .then((data) => {
      cachedData = data;
      return data;
    })
    .catch(() => null);
}
