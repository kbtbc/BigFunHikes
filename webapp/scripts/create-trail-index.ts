/**
 * Script to create an optimized trail file for dynamic segment lookups
 * Creates a JSON file with more points for accurate segment extraction
 * Run with: bun run scripts/create-trail-index.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const GPX_PATH = join(__dirname, "../public/data/appalachian_trail.gpx");
const OUTPUT_PATH = join(__dirname, "../public/data/at-trail-indexed.json");

// More points for accurate segment lookups (but still manageable size)
const TARGET_POINTS = 5000;

interface TrailPoint {
  lat: number;
  lng: number;
  idx: number; // Original index for ordering
}

function parseGPX(gpxText: string): TrailPoint[] {
  const points: TrailPoint[] = [];
  const regex = /<trkpt lat="([^"]+)" lon="([^"]+)">/g;
  let match;
  let idx = 0;

  while ((match = regex.exec(gpxText)) !== null) {
    points.push({
      lat: parseFloat(match[1]),
      lng: parseFloat(match[2]),
      idx: idx++,
    });
  }

  return points;
}

function simplifyTrail(points: TrailPoint[], targetCount: number): TrailPoint[] {
  if (points.length <= targetCount) return points;

  const result: TrailPoint[] = [];
  const step = (points.length - 1) / (targetCount - 1);

  for (let i = 0; i < targetCount - 1; i++) {
    const index = Math.round(i * step);
    result.push(points[index]);
  }

  // Always include the last point
  result.push(points[points.length - 1]);

  return result;
}

async function main() {
  console.log("Reading GPX file...");
  const gpxText = readFileSync(GPX_PATH, "utf-8");

  console.log("Parsing track points...");
  const allPoints = parseGPX(gpxText);
  console.log(`Found ${allPoints.length.toLocaleString()} points`);

  console.log(`Simplifying to ${TARGET_POINTS} points...`);
  const simplified = simplifyTrail(allPoints, TARGET_POINTS);

  // Calculate bounds
  const lats = simplified.map((p) => p.lat);
  const lngs = simplified.map((p) => p.lng);
  const bounds = {
    south: Math.min(...lats),
    north: Math.max(...lats),
    west: Math.min(...lngs),
    east: Math.max(...lngs),
  };

  // Store as flat arrays for smaller file size
  const output = {
    name: "Appalachian Trail (Indexed)",
    totalPoints: allPoints.length,
    indexedPoints: simplified.length,
    bounds,
    // Flat arrays: [lat1, lng1, lat2, lng2, ...]
    coordinates: simplified.flatMap((p) => [p.lat, p.lng]),
    // Original indices for each point (for ordering)
    indices: simplified.map((p) => p.idx),
  };

  console.log("Writing indexed trail file...");
  writeFileSync(OUTPUT_PATH, JSON.stringify(output));

  const fileSize = JSON.stringify(output).length;
  console.log(`\nGeneration complete!`);
  console.log(`  Points: ${simplified.length}`);
  console.log(`  File size: ${(fileSize / 1024).toFixed(2)} KB`);
  console.log(`  Output: ${OUTPUT_PATH}`);
}

main().catch(console.error);
