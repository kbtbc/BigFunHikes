/**
 * Database Export Script
 * Exports all journal entries and photos to a JSON file for backup/restore
 *
 * Usage: bun run scripts/export-db.ts [output-file]
 * Default output: exports/backup_<timestamp>.json
 */

import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile, readFile } from "fs/promises";
import { join } from "path";

const prisma = new PrismaClient();

interface ExportData {
  exportedAt: string;
  version: string;
  entries: Array<{
    id: string;
    date: string;
    dayNumber: number;
    title: string;
    content: string;
    milesHiked: number;
    elevationGain: number | null;
    totalMilesCompleted: number;
    latitude: number | null;
    longitude: number | null;
    locationName: string | null;
    weather: string | null;
    gpxData: string | null;
    suuntoData: string | null;
    entryType: string;
    createdAt: string;
    updatedAt: string;
    photos: Array<{
      id: string;
      url: string;
      caption: string | null;
      order: number;
      createdAt: string;
      // For photos stored as files, we'll include base64 data
      base64Data?: string;
    }>;
  }>;
  replayStudioUploads: Array<{
    id: string;
    shareId: string;
    fileName: string;
    suuntoData: string;
    createdAt: string;
  }>;
}

async function exportDatabase(outputPath?: string): Promise<void> {
  console.log("Starting database export...\n");

  // Fetch all entries with photos
  const entries = await prisma.journalEntry.findMany({
    include: {
      photos: {
        orderBy: { order: "asc" },
      },
    },
    orderBy: { date: "asc" },
  });

  console.log(`Found ${entries.length} journal entries`);

  // Fetch replay studio uploads if the table exists
  let replayStudioUploads: ExportData["replayStudioUploads"] = [];
  try {
    const uploads = await prisma.replayStudioUpload.findMany({
      orderBy: { createdAt: "asc" },
    });
    replayStudioUploads = uploads.map((u) => ({
      id: u.id,
      shareId: u.shareId,
      fileName: u.fileName,
      suuntoData: u.suuntoData,
      createdAt: u.createdAt.toISOString(),
    }));
    console.log(`Found ${replayStudioUploads.length} replay studio uploads`);
  } catch {
    console.log("No replay studio uploads table found (skipping)");
  }

  // Process entries and optionally embed photo data
  const exportEntries: ExportData["entries"] = [];

  for (const entry of entries) {
    const photos = [];

    for (const photo of entry.photos) {
      const photoData: ExportData["entries"][0]["photos"][0] = {
        id: photo.id,
        url: photo.url,
        caption: photo.caption,
        order: photo.order,
        createdAt: photo.createdAt.toISOString(),
      };

      // If photo is stored locally, try to read and embed it
      if (photo.url.startsWith("/uploads/")) {
        try {
          const filePath = join(process.cwd(), "public", photo.url);
          const fileBuffer = await readFile(filePath);
          photoData.base64Data = fileBuffer.toString("base64");
          console.log(`  Embedded photo: ${photo.url}`);
        } catch {
          console.log(`  Warning: Could not read photo file: ${photo.url}`);
        }
      }

      photos.push(photoData);
    }

    exportEntries.push({
      id: entry.id,
      date: entry.date.toISOString(),
      dayNumber: entry.dayNumber,
      title: entry.title,
      content: entry.content,
      milesHiked: entry.milesHiked,
      elevationGain: entry.elevationGain,
      totalMilesCompleted: entry.totalMilesCompleted,
      latitude: entry.latitude,
      longitude: entry.longitude,
      locationName: entry.locationName,
      weather: entry.weather,
      gpxData: entry.gpxData,
      suuntoData: entry.suuntoData,
      entryType: entry.entryType,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      photos,
    });
  }

  const exportData: ExportData = {
    exportedAt: new Date().toISOString(),
    version: "3.18",
    entries: exportEntries,
    replayStudioUploads,
  };

  // Determine output path
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const defaultPath = join(process.cwd(), "exports", `backup_${timestamp}.json`);
  const finalPath = outputPath || defaultPath;

  // Ensure exports directory exists
  await mkdir(join(process.cwd(), "exports"), { recursive: true });

  // Write the export file
  await writeFile(finalPath, JSON.stringify(exportData, null, 2));

  const totalPhotos = exportEntries.reduce((sum, e) => sum + e.photos.length, 0);
  const fileSizeKB = Math.round(JSON.stringify(exportData).length / 1024);

  console.log(`\nExport complete!`);
  console.log(`  Entries: ${exportEntries.length}`);
  console.log(`  Photos: ${totalPhotos}`);
  console.log(`  Replay uploads: ${replayStudioUploads.length}`);
  console.log(`  File size: ${fileSizeKB} KB`);
  console.log(`  Output: ${finalPath}`);
}

// Run export
const outputArg = process.argv[2];
exportDatabase(outputArg)
  .catch((error) => {
    console.error("Export failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
