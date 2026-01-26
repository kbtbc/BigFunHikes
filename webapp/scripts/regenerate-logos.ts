#!/usr/bin/env bun
/**
 * Regenerate logo and favicon files from logo-source.png
 *
 * This script:
 * 1. Loads the source logo and finds the circular logo bounds
 * 2. Extracts just the circular logo portion
 * 3. Converts white/near-white background to transparent
 * 4. Generates high-quality versions at all required sizes using Lanczos3 interpolation
 */

import sharp from 'sharp';
import { join } from 'path';

const PUBLIC_DIR = join(import.meta.dir, '../public');
const SOURCE_PATH = join(PUBLIC_DIR, 'logo-source.png');

async function main() {
  console.log('Regenerating logos and favicons...\n');

  // Load the source image
  const sourceImage = sharp(SOURCE_PATH);
  const metadata = await sourceImage.metadata();
  console.log(`Source image: ${metadata.width}x${metadata.height}`);

  // Get raw pixel data to find the exact logo bounds
  const { data, info } = await sharp(SOURCE_PATH)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // Find bounding box of non-background pixels
  // Background is light gray/white (RGB around 245-255)
  let minX = width, maxX = 0, minY = height, maxY = 0;
  const bgThreshold = 245; // Pixels lighter than this are background

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Check if this pixel is not background
      if (r < bgThreshold || g < bgThreshold || b < bgThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  console.log(`Logo bounds detected: (${minX}, ${minY}) to (${maxX}, ${maxY})`);

  // Make the extraction square and add minimal padding
  const logoWidth = maxX - minX + 1;
  const logoHeight = maxY - minY + 1;
  const size = Math.max(logoWidth, logoHeight);

  // Center the square extraction on the logo
  const centerX = minX + logoWidth / 2;
  const centerY = minY + logoHeight / 2;

  let extractLeft = Math.floor(centerX - size / 2);
  let extractTop = Math.floor(centerY - size / 2);

  // Ensure we don't go out of bounds
  extractLeft = Math.max(0, extractLeft);
  extractTop = Math.max(0, extractTop);
  const extractSize = Math.min(size, width - extractLeft, height - extractTop);

  console.log(`Extracting: ${extractSize}x${extractSize} at (${extractLeft}, ${extractTop})`);

  // Extract the circular logo region
  const extractedBuffer = await sharp(SOURCE_PATH)
    .extract({
      left: extractLeft,
      top: extractTop,
      width: extractSize,
      height: extractSize,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Make white/near-white background transparent
  const pixels = Buffer.from(extractedBuffer.data);
  const transparentThreshold = 248; // More aggressive - only very white pixels become transparent

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    // If the pixel is white or near-white, make it transparent
    if (r > transparentThreshold && g > transparentThreshold && b > transparentThreshold) {
      pixels[i + 3] = 0; // Set alpha to 0
    }
  }

  // Create the processed image with transparent background
  const processedBuffer = await sharp(pixels, {
    raw: {
      width: extractedBuffer.info.width,
      height: extractedBuffer.info.height,
      channels: 4,
    },
  }).png({ compressionLevel: 6 }).toBuffer();

  console.log(`Processed logo: ${extractedBuffer.info.width}x${extractedBuffer.info.height}`);
  console.log('Background made transparent\n');

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
    { name: 'apple-touch-icon.png', size: 180 },
  ];

  // Generate logo sizes with high-quality Lanczos3 interpolation
  console.log('Generating logos:');
  for (const { name, size } of logoSizes) {
    const outputPath = join(PUBLIC_DIR, name);
    await sharp(processedBuffer)
      .resize(size, size, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 6, quality: 100 })
      .toFile(outputPath);
    console.log(`  ${name} (${size}x${size})`);
  }

  // Generate favicon sizes with high-quality interpolation
  console.log('\nGenerating favicons:');
  for (const { name, size } of faviconSizes) {
    const outputPath = join(PUBLIC_DIR, name);
    await sharp(processedBuffer)
      .resize(size, size, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 6, quality: 100 })
      .toFile(outputPath);
    console.log(`  ${name} (${size}x${size})`);
  }

  // Generate favicon.ico (use 32x32 PNG - modern browsers support this)
  const favicon32Buffer = await sharp(processedBuffer)
    .resize(32, 32, {
      kernel: sharp.kernel.lanczos3,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp(favicon32Buffer).toFile(join(PUBLIC_DIR, 'favicon.ico'));
  console.log('  favicon.ico (32x32)');

  console.log('\nAll logos and favicons regenerated successfully!');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
