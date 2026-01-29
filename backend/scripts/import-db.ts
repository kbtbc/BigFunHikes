/**
 * Database Import Script
 * Restores journal entries and photos from a JSON backup file
 *
 * Usage: bun run scripts/import-db.ts <backup-file.json>
 *
 * WARNING: This will add entries from the backup. It does NOT delete existing entries.
 * To do a full restore, manually delete the database first:
 *   rm prisma/dev.db && bunx prisma db push
 */

import { PrismaClient } from "@prisma/client";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";

const prisma = new PrismaClient();

interface ImportData {
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
      base64Data?: string;
    }>;
  }>;
  replayStudioUploads?: Array<{
    id: string;
    shareId: string;
    fileName: string;
    suuntoData: string;
    createdAt: string;
  }>;
}

async function importDatabase(inputPath: string): Promise<void> {
  console.log(`Reading backup file: ${inputPath}\n`);

  const fileContent = await readFile(inputPath, "utf-8");
  const importData: ImportData = JSON.parse(fileContent);

  console.log(`Backup from: ${importData.exportedAt}`);
  console.log(`Version: ${importData.version}`);
  console.log(`Entries to import: ${importData.entries.length}`);
  console.log(`Replay uploads to import: ${importData.replayStudioUploads?.length || 0}\n`);

  let entriesImported = 0;
  let photosImported = 0;
  let photosRestored = 0;

  for (const entry of importData.entries) {
    // Check if entry already exists
    const existing = await prisma.journalEntry.findUnique({
      where: { id: entry.id },
    });

    if (existing) {
      console.log(`  Skipping existing entry: ${entry.title} (${entry.id})`);
      continue;
    }

    // Create the entry
    await prisma.journalEntry.create({
      data: {
        id: entry.id,
        date: new Date(entry.date),
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
        createdAt: new Date(entry.createdAt),
        updatedAt: new Date(entry.updatedAt),
      },
    });

    entriesImported++;
    console.log(`  Imported: ${entry.title}`);

    // Import photos
    for (const photo of entry.photos) {
      // Restore photo file if base64 data is included
      if (photo.base64Data && photo.url.startsWith("/uploads/")) {
        try {
          const filePath = join(process.cwd(), "public", photo.url);
          await mkdir(dirname(filePath), { recursive: true });
          await writeFile(filePath, Buffer.from(photo.base64Data, "base64"));
          photosRestored++;
          console.log(`    Restored file: ${photo.url}`);
        } catch (error) {
          console.log(`    Warning: Could not restore file: ${photo.url}`);
        }
      }

      await prisma.photo.create({
        data: {
          id: photo.id,
          journalEntryId: entry.id,
          url: photo.url,
          caption: photo.caption,
          order: photo.order,
          createdAt: new Date(photo.createdAt),
        },
      });
      photosImported++;
    }
  }

  // Import replay studio uploads
  let replayImported = 0;
  if (importData.replayStudioUploads) {
    for (const upload of importData.replayStudioUploads) {
      try {
        const existing = await prisma.replayStudioUpload.findUnique({
          where: { id: upload.id },
        });

        if (existing) {
          console.log(`  Skipping existing replay: ${upload.fileName}`);
          continue;
        }

        await prisma.replayStudioUpload.create({
          data: {
            id: upload.id,
            shareId: upload.shareId,
            fileName: upload.fileName,
            suuntoData: upload.suuntoData,
            createdAt: new Date(upload.createdAt),
          },
        });
        replayImported++;
        console.log(`  Imported replay: ${upload.fileName}`);
      } catch {
        console.log(`  Warning: Could not import replay (table may not exist)`);
      }
    }
  }

  console.log(`\nImport complete!`);
  console.log(`  Entries imported: ${entriesImported}`);
  console.log(`  Photos imported: ${photosImported}`);
  console.log(`  Photo files restored: ${photosRestored}`);
  console.log(`  Replay uploads imported: ${replayImported}`);
}

// Run import
const inputArg = process.argv[2];
if (!inputArg) {
  console.error("Usage: bun run scripts/import-db.ts <backup-file.json>");
  console.error("\nExample: bun run scripts/import-db.ts exports/backup_2026-01-29.json");
  process.exit(1);
}

importDatabase(inputArg)
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
