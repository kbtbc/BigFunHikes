#!/usr/bin/env bun
/**
 * Convert SVG logo to high-resolution PNG files
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';

const PUBLIC_DIR = join(import.meta.dir, '../public');
const SVG_PATH = join(PUBLIC_DIR, 'logo.svg');

async function main() {
  console.log('Converting SVG to PNG files...\n');

  // Read the SVG file
  const svgBuffer = readFileSync(SVG_PATH);

  // Render SVG at high resolution (2048px) for best quality when downscaling
  const highResBuffer = await sharp(svgBuffer, { density: 300 })
    .resize(2048, 2048)
    .png()
    .toBuffer();

  console.log('Rendered SVG at 2048x2048\n');

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

  // Generate logo sizes
  console.log('Generating logos:');
  for (const { name, size } of logoSizes) {
    const outputPath = join(PUBLIC_DIR, name);
    await sharp(highResBuffer)
      .resize(size, size, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 6 })
      .toFile(outputPath);
    console.log(`  ${name} (${size}x${size})`);
  }

  // Generate favicon sizes
  console.log('\nGenerating favicons:');
  for (const { name, size } of faviconSizes) {
    const outputPath = join(PUBLIC_DIR, name);
    await sharp(highResBuffer)
      .resize(size, size, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 6 })
      .toFile(outputPath);
    console.log(`  ${name} (${size}x${size})`);
  }

  // Generate favicon.ico
  const favicon32Buffer = await sharp(highResBuffer)
    .resize(32, 32, {
      kernel: sharp.kernel.lanczos3,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp(favicon32Buffer).toFile(join(PUBLIC_DIR, 'favicon.ico'));
  console.log('  favicon.ico (32x32)');

  // Also save the high-res version as the new source
  await sharp(highResBuffer)
    .resize(1024, 1024)
    .png({ compressionLevel: 6 })
    .toFile(join(PUBLIC_DIR, 'logo-source-svg.png'));
  console.log('\n  logo-source-svg.png (1024x1024) - new high-res source');

  console.log('\nAll files generated successfully!');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
