/**
 * Generate Open Graph image (1200x630px) for BigFun Hikes
 * 
 * Usage: bun run scripts/generate-og-image.js
 * 
 * Requirements: Install sharp first
 *   bun add sharp
 */

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Brand colors from README.md
const colors = {
  forestGreen: '#4a7c59',
  darkGreen: '#2d5016',
  amber: '#f4a261',
  orange: '#e07a5f',
  cream: '#faf9f6',
  beige: '#f5f5dc',
  charcoal: '#2b2d42',
};

// Dimensions for OG image
const width = 1200;
const height = 630;

async function generateOGImage() {
  // Create SVG with text and styling
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.cream};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.beige};stop-opacity:1" />
        </linearGradient>
        <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:${colors.amber};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.orange};stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
      
      <!-- Decorative elements - mountain silhouette -->
      <path d="M 0 ${height} L 0 ${height * 0.6} Q 200 ${height * 0.5} 400 ${height * 0.55} T 800 ${height * 0.6} L ${width} ${height * 0.65} L ${width} ${height} Z" 
            fill="${colors.forestGreen}" opacity="0.3"/>
      <path d="M 0 ${height} L 0 ${height * 0.7} Q 300 ${height * 0.6} 600 ${height * 0.65} T ${width} ${height * 0.7} L ${width} ${height} Z" 
            fill="${colors.darkGreen}" opacity="0.2"/>
      
      <!-- Accent line -->
      <line x1="0" y1="${height * 0.3}" x2="${width}" y2="${height * 0.3}" 
            stroke="url(#accentGradient)" stroke-width="4" opacity="0.6"/>
      
      <!-- Main title -->
      <text x="${width / 2}" y="${height * 0.4}" 
            font-family="'Outfit', 'Arial', sans-serif" 
            font-size="72" 
            font-weight="bold" 
            fill="${colors.charcoal}" 
            text-anchor="middle" 
            dominant-baseline="middle">
        BigFun Hikes!
      </text>
      
      <!-- Subtitle -->
      <text x="${width / 2}" y="${height * 0.5}" 
            font-family="'Inter', 'Arial', sans-serif" 
            font-size="32" 
            fill="${colors.forestGreen}" 
            text-anchor="middle" 
            dominant-baseline="middle">
        Appalachian Trail Journal
      </text>
      
      <!-- Tagline -->
      <text x="${width / 2}" y="${height * 0.65}" 
            font-family="'Inter', 'Arial', sans-serif" 
            font-size="24" 
            fill="${colors.charcoal}" 
            opacity="0.7"
            text-anchor="middle" 
            dominant-baseline="middle">
        Follow my journey along the Appalachian Trail
      </text>
      
      <!-- Decorative trail icon (simplified) -->
      <circle cx="${width * 0.15}" cy="${height * 0.25}" r="8" fill="${colors.amber}"/>
      <circle cx="${width * 0.85}" cy="${height * 0.25}" r="8" fill="${colors.orange}"/>
      <path d="M ${width * 0.15} ${height * 0.25} Q ${width * 0.5} ${height * 0.15} ${width * 0.85} ${height * 0.25}" 
            stroke="${colors.amber}" stroke-width="3" fill="none" opacity="0.5" stroke-dasharray="5,5"/>
    </svg>
  `;

  // Convert SVG to PNG
  const outputPath = join(__dirname, '../public/og-base.png');
  
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
  
  console.log(`✅ Open Graph image generated successfully at: ${outputPath}`);
  console.log(`   Dimensions: ${width}x${height}px`);
}

generateOGImage().catch(console.error);
