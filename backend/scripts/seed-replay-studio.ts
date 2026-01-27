/**
 * Seed script for Suunto Replay Studio
 *
 * This script ensures the demo data file is in place for the Replay Studio sub-project.
 * Run with: bun run seed:replay-studio
 */

import * as fs from "fs";
import * as path from "path";

const DEMO_DATA_FILENAME = "suwaneetrek-1.json";
const BACKEND_DATA_DIR = path.join(process.cwd(), "data");
const BACKEND_DATA_PATH = path.join(BACKEND_DATA_DIR, DEMO_DATA_FILENAME);

// Alternative source locations to check
const SOURCE_LOCATIONS = [
  path.join(process.cwd(), "..", "webapp", "public", "suwaneetrek-1-2.json"),
  path.join(process.cwd(), "..", "webapp", "public", "suwaneetrek-1.json"),
  path.join(process.cwd(), "data", "suwaneetrek-1.json"),
];

async function seedReplayStudio() {
  console.log("🎬 Seeding Suunto Replay Studio...\n");

  // Ensure data directory exists
  if (!fs.existsSync(BACKEND_DATA_DIR)) {
    console.log(`📁 Creating data directory: ${BACKEND_DATA_DIR}`);
    fs.mkdirSync(BACKEND_DATA_DIR, { recursive: true });
  }

  // Check if demo data already exists
  if (fs.existsSync(BACKEND_DATA_PATH)) {
    const stats = fs.statSync(BACKEND_DATA_PATH);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Demo data already exists: ${BACKEND_DATA_PATH}`);
    console.log(`   Size: ${sizeMB} MB`);
    console.log(`   Modified: ${stats.mtime.toISOString()}`);
    console.log("\n🎉 Replay Studio is ready!");
    console.log("   Demo route: GET /api/replay-studio/demo");
    console.log("   Frontend: /suunto/demo");
    return;
  }

  // Try to find source data
  console.log("🔍 Looking for demo data source...");

  let sourceFound = false;
  for (const sourcePath of SOURCE_LOCATIONS) {
    if (fs.existsSync(sourcePath)) {
      console.log(`   Found: ${sourcePath}`);

      // Copy the file
      console.log(`📋 Copying to: ${BACKEND_DATA_PATH}`);
      fs.copyFileSync(sourcePath, BACKEND_DATA_PATH);

      const stats = fs.statSync(BACKEND_DATA_PATH);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`✅ Demo data copied successfully (${sizeMB} MB)`);

      sourceFound = true;
      break;
    }
  }

  if (!sourceFound) {
    console.error("❌ ERROR: Could not find demo data source file.");
    console.error("\nExpected locations:");
    SOURCE_LOCATIONS.forEach(loc => console.error(`   - ${loc}`));
    console.error("\nTo fix this:");
    console.error("1. Download a Suunto JSON export file");
    console.error(`2. Place it at: ${BACKEND_DATA_PATH}`);
    console.error("3. Run this script again");
    process.exit(1);
  }

  // Validate the data
  console.log("\n🔬 Validating demo data...");
  try {
    const content = fs.readFileSync(BACKEND_DATA_PATH, "utf-8");
    const json = JSON.parse(content);

    // Check for required Suunto data fields
    const hasGpsTrack = json.DeviceLog?.Samples?.some((s: { Longitude?: number }) => s.Longitude !== undefined);
    const hasHeartRate = json.DeviceLog?.Samples?.some((s: { HR?: number }) => s.HR !== undefined);

    console.log(`   ✓ Valid JSON`);
    console.log(`   ✓ GPS Track: ${hasGpsTrack ? "Yes" : "No"}`);
    console.log(`   ✓ Heart Rate: ${hasHeartRate ? "Yes" : "No"}`);

    if (!hasGpsTrack) {
      console.warn("   ⚠️  Warning: No GPS track data found - map will be empty");
    }
  } catch (e) {
    console.error("❌ ERROR: Demo data validation failed:", e);
    process.exit(1);
  }

  console.log("\n🎉 Replay Studio seeding complete!");
  console.log("   Demo route: GET /api/replay-studio/demo");
  console.log("   Frontend: /suunto/demo");
}

// Run the seed
seedReplayStudio().catch(console.error);
