/**
 * Cleanup script to remove orphaned upload files
 * Run with: bun run scripts/cleanup-orphans.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs/promises";
import * as path from "path";

const prisma = new PrismaClient();
const uploadsDir = path.join(process.cwd(), "public", "uploads");

async function cleanupOrphans() {
  console.log("🧹 Scanning for orphaned uploads...\n");

  try {
    // Get all photo URLs from database
    const photos = await prisma.photo.findMany({
      select: { url: true },
    });

    const dbFilenames = new Set(
      photos
        .map((p) => {
          const match = p.url.match(/\/public\/uploads\/(.+)$/);
          return match ? match[1] : null;
        })
        .filter(Boolean) as string[]
    );

    console.log(`📁 Found ${dbFilenames.size} photos in database`);

    // Get all files in uploads directory
    let uploadedFiles: string[] = [];
    try {
      uploadedFiles = await fs.readdir(uploadsDir);
    } catch (err) {
      console.log("⚠️  Uploads directory doesn't exist or is empty");
      return;
    }

    console.log(`📂 Found ${uploadedFiles.length} files in uploads directory\n`);

    // Find orphans
    const orphans = uploadedFiles.filter((f) => !dbFilenames.has(f));

    if (orphans.length === 0) {
      console.log("✅ No orphaned files found!");
      return;
    }

    console.log(`🗑️  Found ${orphans.length} orphaned files:\n`);

    let totalSize = 0;
    for (const filename of orphans) {
      const filepath = path.join(uploadsDir, filename);
      try {
        const stat = await fs.stat(filepath);
        totalSize += stat.size;
        console.log(`   - ${filename} (${(stat.size / 1024).toFixed(1)} KB)`);
      } catch {
        console.log(`   - ${filename} (size unknown)`);
      }
    }

    console.log(`\n📊 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

    // Check for --delete flag
    if (process.argv.includes("--delete")) {
      console.log("\n🗑️  Deleting orphaned files...\n");

      let deleted = 0;
      for (const filename of orphans) {
        const filepath = path.join(uploadsDir, filename);
        try {
          await fs.unlink(filepath);
          console.log(`   ✓ Deleted: ${filename}`);
          deleted++;
        } catch (err) {
          console.log(`   ✗ Failed to delete: ${filename}`);
        }
      }

      console.log(`\n✅ Deleted ${deleted}/${orphans.length} orphaned files`);
    } else {
      console.log("\n💡 Run with --delete to remove orphaned files:");
      console.log("   bun run scripts/cleanup-orphans.ts --delete");
    }
  } catch (error) {
    console.error("Error during cleanup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOrphans();
