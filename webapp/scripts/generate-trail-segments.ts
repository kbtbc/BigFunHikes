/**
 * Script to generate pre-computed trail segments for journal entries
 * This creates a JSON file with trail segments between known coordinates
 * Run with: bun run scripts/generate-trail-segments.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const GPX_PATH = join(__dirname, "../public/data/appalachian_trail.gpx");
const OUTPUT_PATH = join(__dirname, "../public/data/trail-segments.json");

// Known entry coordinates (from seed data) - ordered south to north along the trail
const ENTRY_COORDINATES = [
  { day: 0, name: "Springer Mountain (Start)", lat: 34.6266, lng: -84.1934 },
  { day: 1, name: "Hawk Mountain Shelter", lat: 34.6689, lng: -84.1456 },
  { day: 2, name: "Gooch Gap", lat: 34.6912, lng: -84.1234 },
  { day: 3, name: "Woody Gap", lat: 34.6778, lng: -83.9912 },
  { day: 4, name: "Low Gap Shelter", lat: 34.7234, lng: -83.9345 },
  { day: 5, name: "Blue Mountain Shelter", lat: 34.7567, lng: -83.8901 },
  { day: 6, name: "Deep Gap Shelter", lat: 34.9012, lng: -83.7823 },
  { day: 7, name: "Standing Indian Shelter", lat: 35.0234, lng: -83.5567 },
  { day: 8, name: "Carter Gap Shelter", lat: 35.0678, lng: -83.5012 },
  { day: 9, name: "Rock Gap", lat: 35.1123, lng: -83.4567 },
  { day: 10, name: "Wayah Bald", lat: 35.1756, lng: -83.5589 },
];

interface TrailPoint {
  lat: number;
  lng: number;
  ele?: number;
}

function parseGPX(gpxText: string): TrailPoint[] {
  const points: TrailPoint[] = [];
  const regex = /<trkpt lat="([^"]+)" lon="([^"]+)">\s*<ele>([^<]+)<\/ele>/g;
  let match;

  while ((match = regex.exec(gpxText)) !== null) {
    points.push({
      lat: parseFloat(match[1]),
      lng: parseFloat(match[2]),
      ele: parseFloat(match[3]),
    });
  }

  return points;
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
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

function findClosestPointIndex(
  trailPoints: TrailPoint[],
  targetLat: number,
  targetLng: number,
  startIndex = 0
): number {
  let closestIndex = startIndex;
  let closestDistance = Infinity;

  // Search within a reasonable range (trail generally goes north)
  const searchEnd = Math.min(startIndex + 50000, trailPoints.length);

  for (let i = startIndex; i < searchEnd; i++) {
    const point = trailPoints[i];
    const distance = haversineDistance(
      targetLat,
      targetLng,
      point.lat,
      point.lng
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = i;
    }
  }

  return closestIndex;
}

function extractSegment(
  trailPoints: TrailPoint[],
  startIndex: number,
  endIndex: number,
  targetPoints: number
): [number, number][] {
  const segmentLength = endIndex - startIndex;
  const step = Math.max(1, Math.floor(segmentLength / targetPoints));
  const segment: [number, number][] = [];

  // Always include start point
  segment.push([trailPoints[startIndex].lat, trailPoints[startIndex].lng]);

  for (let i = startIndex + step; i < endIndex; i += step) {
    segment.push([trailPoints[i].lat, trailPoints[i].lng]);
  }

  // Always include end point
  if (endIndex < trailPoints.length) {
    segment.push([trailPoints[endIndex].lat, trailPoints[endIndex].lng]);
  }

  return segment;
}

async function main() {
  console.log("Reading GPX file...");
  const gpxText = readFileSync(GPX_PATH, "utf-8");

  console.log("Parsing track points...");
  const trailPoints = parseGPX(gpxText);
  console.log(`Found ${trailPoints.length.toLocaleString()} points`);

  const segments: Record<
    number,
    {
      day: number;
      startName: string;
      endName: string;
      coordinates: number[]; // flat array
      bounds: { south: number; north: number; west: number; east: number };
    }
  > = {};

  let lastIndex = 0;

  console.log("\nGenerating segments for each day...");

  for (let i = 1; i < ENTRY_COORDINATES.length; i++) {
    const startCoord = ENTRY_COORDINATES[i - 1];
    const endCoord = ENTRY_COORDINATES[i];
    const day = endCoord.day;

    console.log(`  Day ${day}: ${startCoord.name} → ${endCoord.name}`);

    // Find closest points on trail
    const startIndex = findClosestPointIndex(
      trailPoints,
      startCoord.lat,
      startCoord.lng,
      lastIndex
    );
    const endIndex = findClosestPointIndex(
      trailPoints,
      endCoord.lat,
      endCoord.lng,
      startIndex
    );

    // Extract segment with ~100 points per day (good balance of detail and size)
    const segment = extractSegment(trailPoints, startIndex, endIndex, 100);

    // Calculate bounds
    const lats = segment.map((p) => p[0]);
    const lngs = segment.map((p) => p[1]);

    segments[day] = {
      day,
      startName: startCoord.name,
      endName: endCoord.name,
      coordinates: segment.flat(),
      bounds: {
        south: Math.min(...lats),
        north: Math.max(...lats),
        west: Math.min(...lngs),
        east: Math.max(...lngs),
      },
    };

    lastIndex = endIndex;
  }

  const output = {
    generated: new Date().toISOString(),
    segmentCount: Object.keys(segments).length,
    segments,
  };

  console.log("\nWriting segments file...");
  writeFileSync(OUTPUT_PATH, JSON.stringify(output));

  const fileSize = JSON.stringify(output).length;
  console.log(`\nGeneration complete!`);
  console.log(`  Segments: ${Object.keys(segments).length}`);
  console.log(`  File size: ${(fileSize / 1024).toFixed(2)} KB`);
  console.log(`  Output: ${OUTPUT_PATH}`);
}

main().catch(console.error);
