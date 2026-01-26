/**
 * Script to convert large GPX file to optimized JSON for faster loading
 * Run with: bun run scripts/optimize-gpx.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const GPX_PATH = join(__dirname, "../public/data/appalachian_trail.gpx");
const OUTPUT_PATH = join(__dirname, "../public/data/at-trail-optimized.json");

// Target number of points (balance between detail and performance)
const TARGET_POINTS = 2000;

function parseGPX(gpxText: string): [number, number][] {
  // Simple regex-based parsing for speed
  const points: [number, number][] = [];
  const regex = /<trkpt lat="([^"]+)" lon="([^"]+)">/g;
  let match;

  while ((match = regex.exec(gpxText)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    if (lat && lon) {
      points.push([lat, lon]);
    }
  }

  return points;
}

function simplifyTrail(points: [number, number][], targetCount: number): [number, number][] {
  if (points.length <= targetCount) return points;

  const result: [number, number][] = [];
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
  const lats = simplified.map((p) => p[0]);
  const lngs = simplified.map((p) => p[1]);
  const bounds = {
    south: Math.min(...lats),
    north: Math.max(...lats),
    west: Math.min(...lngs),
    east: Math.max(...lngs),
  };

  const output = {
    name: "Appalachian Trail",
    pointCount: simplified.length,
    bounds,
    // Store as flat array for smaller file size: [lat1, lng1, lat2, lng2, ...]
    coordinates: simplified.flat(),
  };

  console.log("Writing optimized JSON...");
  writeFileSync(OUTPUT_PATH, JSON.stringify(output));

  const originalSize = gpxText.length;
  const newSize = JSON.stringify(output).length;
  console.log(`\nOptimization complete!`);
  console.log(`  Original: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Optimized: ${(newSize / 1024).toFixed(2)} KB`);
  console.log(`  Reduction: ${((1 - newSize / originalSize) * 100).toFixed(1)}%`);
  console.log(`\nOutput: ${OUTPUT_PATH}`);
}

main().catch(console.error);
