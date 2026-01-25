#!/usr/bin/env bun
/**
 * Optimize images in public/images/ folder for web use
 *
 * This script:
 * 1. Resizes images to max 1200px width/height (preserving aspect ratio)
 * 2. Compresses with quality 80 for good balance of size/quality
 * 3. Converts to progressive JPEG for faster perceived loading
 * 4. Renames files to simpler names (photo-01.jpg, photo-02.jpg, etc.)
 */

import sharp from 'sharp';
import { readdirSync, mkdirSync, rmSync, renameSync, existsSync } from 'fs';
import { join, extname } from 'path';

const IMAGES_DIR = join(import.meta.dir, '../public/images');
const MAX_DIMENSION = 1200;
const QUALITY = 80;

async function main() {
  console.log('🖼️  Optimizing images for web use...\n');

  // Get all image files
  const files = readdirSync(IMAGES_DIR)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .sort();

  console.log(`Found ${files.length} images to optimize\n`);

  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;

  // Process each image
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const inputPath = join(IMAGES_DIR, file);
    const newName = `photo-${String(i + 1).padStart(2, '0')}.jpg`;
    const outputPath = join(IMAGES_DIR, `_${newName}`); // Temp name to avoid conflicts

    try {
      // Get original file size
      const originalStats = Bun.file(inputPath);
      const originalSize = originalStats.size;
      totalOriginalSize += originalSize;

      // Process image
      const image = sharp(inputPath);
      const metadata = await image.metadata();

      // Resize if larger than max dimension
      let resizeOptions = {};
      if (metadata.width && metadata.height) {
        if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
          resizeOptions = {
            width: MAX_DIMENSION,
            height: MAX_DIMENSION,
            fit: 'inside',
            withoutEnlargement: true,
          };
        }
      }

      // Process and save
      await image
        .rotate() // Auto-rotate based on EXIF
        .resize(resizeOptions.width ? resizeOptions : undefined)
        .jpeg({
          quality: QUALITY,
          progressive: true,
        })
        .toFile(outputPath);

      // Get optimized file size
      const optimizedStats = Bun.file(outputPath);
      const optimizedSize = optimizedStats.size;
      totalOptimizedSize += optimizedSize;

      const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
      console.log(`  ✓ ${file} → ${newName} (${formatBytes(originalSize)} → ${formatBytes(optimizedSize)}, -${savings}%)`);
    } catch (error) {
      console.error(`  ✗ Error processing ${file}:`, error);
    }
  }

  // Now rename temp files to final names and remove originals
  console.log('\nCleaning up...');

  // Remove original files
  for (const file of files) {
    const filePath = join(IMAGES_DIR, file);
    if (existsSync(filePath)) {
      rmSync(filePath);
    }
  }

  // Rename temp files to final names
  const tempFiles = readdirSync(IMAGES_DIR).filter(f => f.startsWith('_photo-'));
  for (const tempFile of tempFiles) {
    const finalName = tempFile.slice(1); // Remove leading underscore
    renameSync(join(IMAGES_DIR, tempFile), join(IMAGES_DIR, finalName));
  }

  const totalSavings = ((1 - totalOptimizedSize / totalOriginalSize) * 100).toFixed(1);
  console.log(`\n✅ Optimization complete!`);
  console.log(`   Original: ${formatBytes(totalOriginalSize)}`);
  console.log(`   Optimized: ${formatBytes(totalOptimizedSize)}`);
  console.log(`   Savings: ${formatBytes(totalOriginalSize - totalOptimizedSize)} (${totalSavings}%)`);
  console.log(`\n📁 ${files.length} images renamed to photo-01.jpg through photo-${String(files.length).padStart(2, '0')}.jpg`);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

main().catch(console.error);
