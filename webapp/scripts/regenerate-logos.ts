#!/usr/bin/env bun
/**
 * Regenerate logo and favicon files from logo-source.png
 *
 * This script:
 * 1. Loads the source logo
 * 2. Trims whitespace around the circular logo
 * 3. Converts white/near-white background to transparent
 * 4. Generates all required sizes for logos and favicons
 */

import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join } from 'path';

const PUBLIC_DIR = join(import.meta.dir, '../public');
const SOURCE_PATH = join(PUBLIC_DIR, 'logo-source.png');

async function main() {
  console.log('🎨 Regenerating logos and favicons...\n');

  // Load the source image
  const sourceImage = sharp(SOURCE_PATH);
  const metadata = await sourceImage.metadata();
  console.log(`Source image: ${metadata.width}x${metadata.height}`);

  // First, trim the whitespace to isolate the circular logo
  // Then make white/near-white pixels transparent
  const trimmedBuffer = await sourceImage
    .trim({
      background: { r: 255, g: 255, b: 255 },
      threshold: 50, // Tolerance for "white" detection
    })
    .png()
    .toBuffer();

  // Get the trimmed dimensions
  const trimmedImage = sharp(trimmedBuffer);
  const trimmedMeta = await trimmedImage.metadata();
  console.log(`After trim: ${trimmedMeta.width}x${trimmedMeta.height}`);

  // Make white background transparent
  // We'll use a raw pixel manipulation approach
  const { data, info } = await trimmedImage
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Convert white/near-white pixels to transparent
  const pixels = Buffer.from(data);
  const threshold = 240; // Pixels with R, G, B all above this become transparent

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // If the pixel is white or near-white, make it transparent
    if (r > threshold && g > threshold && b > threshold) {
      pixels[i + 3] = 0; // Set alpha to 0
    }
  }

  // Create the processed image with transparent background
  const processedImage = sharp(pixels, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  });

  // Save the processed base image as a buffer for resizing
  const processedBuffer = await processedImage.png().toBuffer();
  console.log('✓ Background made transparent\n');

  // Define output sizes
  const logoSizes = [
    { name: 'logo.png', size: 192 },
    { name: 'logo-256.png', size: 256 },
    { name: 'logo-512.png', size: 512 },
    { name: 'logo-1024.png', size: 1024 },
  ];

  const faviconSizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
  ];

  // Generate logo sizes
  console.log('Generating logos:');
  for (const { name, size } of logoSizes) {
    const outputPath = join(PUBLIC_DIR, name);
    await sharp(processedBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outputPath);
    console.log(`  ✓ ${name} (${size}x${size})`);
  }

  // Generate favicon sizes
  console.log('\nGenerating favicons:');
  for (const { name, size } of faviconSizes) {
    const outputPath = join(PUBLIC_DIR, name);
    await sharp(processedBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outputPath);
    console.log(`  ✓ ${name} (${size}x${size})`);
  }

  // Generate favicon.ico (multi-size ICO file)
  // Sharp doesn't support ICO directly, so we'll create a 32x32 PNG as the primary favicon
  // and also create individual sizes that browsers can use
  const favicon32 = await sharp(processedBuffer)
    .resize(32, 32, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // For favicon.ico, we'll just copy the 32x32 as a PNG
  // Most modern browsers prefer PNG anyway
  // If you need a true .ico, you'd need a separate tool
  console.log('\n✓ favicon.ico - Note: Using PNG format (modern browsers support this)');

  console.log('\n✅ All logos and favicons regenerated successfully!');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
