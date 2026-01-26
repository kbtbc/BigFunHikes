#!/usr/bin/env bun
/**
 * Seed script to populate the database with sample journal entries
 *
 * This creates 10 days of realistic Appalachian Trail journal entries
 * with photos, weather data, and varied hiking statistics.
 *
 * Usage:
 *   cd backend
 *   bun run seed
 *
 * Or directly:
 *   bun run scripts/seed-sample-data.ts
 *
 * Note: This will DELETE all existing journal entries and photos!
 */

import { PrismaClient } from '@prisma/client';
import { parseSuuntoJson } from '../src/suunto-parser';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Personal photos from /webapp/public/images/
// These are optimized hiking photos (photo-01.jpg through photo-50.jpg)
const PERSONAL_PHOTOS = Array.from({ length: 50 }, (_, i) =>
  `/images/photo-${String(i + 1).padStart(2, '0')}.jpg`
);

// Shuffle array helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get random photos for entries
const shuffledPhotos = shuffleArray(PERSONAL_PHOTOS);

// Photo index tracker for assigning unique photos to each entry
let photoIndex = 0;
function getNextPhotos(count: number): string[] {
  const photos = shuffledPhotos.slice(photoIndex, photoIndex + count);
  photoIndex += count;
  return photos;
}

const SAMPLE_ENTRIES = [
  {
    day: -1,
    date: '2026-01-23',
    title: 'Pre-Trail Training Hike - Suwanee Creek Greenway',
    location: 'Suwanee Creek Greenway, GA',
    latitude: 34.2479,
    longitude: -84.1125,
    entryType: 'training' as const,
    suuntoFile: 'suwaneetrek-1.json', // Will load Suunto data from this file
    content: `Amazing training hike on the Suwanee Creek Greenway! This was a great shakedown for my upcoming AT thru-hike attempt.

The watch data shows I'm getting into solid hiking shape:
- Covered over 10 miles with significant elevation changes
- Heart rate stayed mostly in zones 1-2 (aerobic conditioning)
- Pace was consistent throughout the hike

The trail had some surprisingly challenging terrain for a greenway - lots of elevation variation and technical sections. Great prep for the real mountains ahead!

My legs feel strong and ready. Just need to keep up the training until Springer Mountain!`,
    milesHiked: 10.7, // Will be updated from Suunto data
    elevationGain: 2058, // Will be updated from Suunto data
    weather: {
      temperature: 65,
      temperatureUnit: 'F' as const,
      conditions: 'Partly Cloudy',
      humidity: 55,
      windSpeed: 8,
      windUnit: 'mph',
      recordedAt: '2026-01-23T12:00:00Z',
    },
    photoCaptions: [
      'Testing my full pack setup on the greenway',
    ],
  },
  {
    day: 1,
    date: '2026-03-15',
    title: 'Springer Mountain to Hawk Mountain Shelter',
    location: 'Springer Mountain, GA',
    latitude: 34.6266,
    longitude: -84.1934,
    content: `Started my Appalachian Trail journey at Springer Mountain! The weather was perfect - crisp morning air with sunshine breaking through the trees. The first climb was tougher than expected with a full pack, but the views from the summit made it worthwhile.

Met several other thru-hikers at the shelter tonight. Everyone is excited and a bit nervous. Trail names are already starting to emerge. Someone called me "Basecamp" because of my oversized pack. Might need to mail some gear home!

The shelter is cozy but crowded. Hanging my food bag and settling in for my first night on trail. Can't believe this adventure is finally happening!`,
    milesHiked: 8.3,
    elevationGain: 2100,
    weather: {
      temperature: 52,
      temperatureUnit: 'F' as const,
      conditions: 'Sunny',
      humidity: 65,
      windSpeed: 5,
      windUnit: 'mph',
      recordedAt: '2026-03-15T16:00:00Z',
    },
    photoCaptions: [
      'Summit of Springer Mountain - Day 1!',
      'First steps on the AT',
    ],
  },
  {
    day: 2,
    date: '2026-03-16',
    title: 'Hawk Mountain to Gooch Gap',
    location: 'Gooch Gap, GA',
    latitude: 34.6608,
    longitude: -84.1256,
    content: `Second day and my feet are already feeling it! Broke camp early and made good time despite some challenging climbs. The Georgia mountains don't mess around.

Passed through some beautiful hardwood forests. The trees are just starting to show signs of spring. Saw my first wildflowers of the trip - tiny white blossoms along the trail.

Took a longer break at Gooch Gap to soak my feet in the creek. Absolute heaven. Met a section hiker who gave me beta on the next few days. Water sources are good right now.`,
    milesHiked: 12.1,
    elevationGain: 2850,
    weather: {
      temperature: 58,
      temperatureUnit: 'F' as const,
      conditions: 'Partly Cloudy',
      humidity: 70,
      windSpeed: 8,
      windUnit: 'mph',
      recordedAt: '2026-03-16T17:30:00Z',
    },
    photoCaptions: [
      'Morning mist in the valleys',
    ],
  },
  {
    day: 3,
    date: '2026-03-17',
    title: 'Gooch Gap to Woody Gap',
    location: 'Woody Gap, GA',
    latitude: 34.6789,
    longitude: -84.0456,
    content: `Legs are getting stronger! Today felt much better than yesterday. The trail follows ridgelines with constant ups and downs, but I'm finding my rhythm.

Stopped at Neel Gap to resupply. The outfitter there is legendary - they have a "hiker box" full of gear people have mailed home. I contributed my camp chair and grabbed some freeze-dried meals.

Met a trail angel named "Biscuit" who gave me fresh baked goods. Trail magic is real! These small kindnesses mean everything out here.`,
    milesHiked: 11.7,
    elevationGain: 2400,
    weather: {
      temperature: 61,
      temperatureUnit: 'F' as const,
      conditions: 'Sunny',
      humidity: 55,
      windSpeed: 6,
      windUnit: 'mph',
      recordedAt: '2026-03-17T18:00:00Z',
    },
    photoCaptions: [
      'Beautiful forest corridor',
      'Trail magic!',
    ],
  },
  {
    day: 4,
    date: '2026-03-18',
    title: 'Woody Gap to Low Gap Shelter',
    location: 'Blood Mountain, GA',
    latitude: 34.7398,
    longitude: -83.9367,
    content: `Big mile day today! Feeling strong and the weather cooperated perfectly. The trail was well-maintained through this section with gentle grades.

Saw my first bear! It was a black bear cub, which meant mama was nearby. I made noise and backed away slowly. My heart was racing but it was incredible to see wildlife up close.

The sunset from Low Gap was spectacular - layers of blue mountains fading into the distance. This is why I'm out here.`,
    milesHiked: 15.2,
    elevationGain: 3100,
    weather: {
      temperature: 64,
      temperatureUnit: 'F' as const,
      conditions: 'Clear',
      humidity: 50,
      windSpeed: 4,
      windUnit: 'mph',
      recordedAt: '2026-03-18T19:00:00Z',
    },
    photoCaptions: [
      'Evening light on the trail',
    ],
  },
  {
    day: 5,
    date: '2026-03-19',
    title: 'Low Gap to Blue Mountain Shelter',
    location: 'Neel Gap, GA',
    latitude: 34.7319,
    longitude: -83.9186,
    content: `Tougher day mentally. Woke up to rain and hiked in drizzle most of the morning. Everything is wet and staying motivated was hard.

But the afternoon cleared up and I pushed through. The climb up to Blue Mountain was steep but the views at the top were worth every step. Could see for miles in every direction.

Met a SOBO (southbound) hiker who's finishing up. She gave me encouragement and said the trail only gets better. Looking forward to what's ahead!`,
    milesHiked: 13.4,
    elevationGain: 2900,
    weather: {
      temperature: 55,
      temperatureUnit: 'F' as const,
      conditions: 'Rain',
      humidity: 85,
      windSpeed: 12,
      windUnit: 'mph',
      recordedAt: '2026-03-19T16:30:00Z',
    },
    photoCaptions: [
      'Above the clouds on Blue Mountain',
      'Clearing storm',
    ],
  },
  {
    day: 6,
    date: '2026-03-20',
    title: 'Blue Mountain to Deep Gap Shelter',
    location: 'Tesnatee Gap, GA',
    latitude: 34.7456,
    longitude: -83.8534,
    content: `Incredible day! The trail followed a ridge with 360-degree views for miles. Spring is arriving in the lowlands but up here it still feels like winter in spots.

Found a great rhythm today. My pack feels lighter (or I'm getting stronger). Either way, hiking is becoming more enjoyable and less of a grind.

Camped with a great group tonight. We cooked dinner together and shared stories around the shelter. The trail community is amazing - already feel like I've known these people for years.`,
    milesHiked: 14.8,
    elevationGain: 2600,
    weather: {
      temperature: 59,
      temperatureUnit: 'F' as const,
      conditions: 'Sunny',
      humidity: 60,
      windSpeed: 7,
      windUnit: 'mph',
      recordedAt: '2026-03-20T18:30:00Z',
    },
    photoCaptions: [
      'Ridge walking perfection',
    ],
  },
  {
    day: 7,
    date: '2026-03-21',
    title: 'Deep Gap to Standing Indian Shelter',
    location: 'Standing Indian Mountain, NC',
    latitude: 35.0275,
    longitude: -83.5583,
    content: `Week one complete! Can't believe I've been out here for a full week. My body is adapting but my feet are still angry at me.

Today's highlight was crossing into North Carolina! State #2 of 14. The border was marked with a simple sign but it felt like a huge milestone.

The climb up Standing Indian Mountain was brutal - over 1,000 feet in less than a mile. But the summit views made it worthwhile. Could see layers of mountains in every direction.`,
    milesHiked: 16.1,
    elevationGain: 3400,
    weather: {
      temperature: 62,
      temperatureUnit: 'F' as const,
      conditions: 'Partly Cloudy',
      humidity: 65,
      windSpeed: 10,
      windUnit: 'mph',
      recordedAt: '2026-03-21T19:00:00Z',
    },
    photoCaptions: [
      'Welcome to North Carolina!',
      'Standing Indian summit',
    ],
  },
  {
    day: 8,
    date: '2026-03-22',
    title: 'Standing Indian to Carter Gap Shelter',
    location: 'Carter Gap, NC',
    latitude: 35.0756,
    longitude: -83.5234,
    content: `Recovery day - took it easy with lower mileage. My body needed the break. Lots of rolling terrain through beautiful forest.

Saw wild turkeys this morning! A whole flock of them crossed the trail in front of me. They're surprisingly large up close.

Stream crossings are getting easier. I've learned to just embrace wet feet - they'll dry eventually. Trying not to overthink every rock hop.

Town stop tomorrow for resupply. Already dreaming about real food!`,
    milesHiked: 10.5,
    elevationGain: 1800,
    weather: {
      temperature: 60,
      temperatureUnit: 'F' as const,
      conditions: 'Overcast',
      humidity: 75,
      windSpeed: 5,
      windUnit: 'mph',
      recordedAt: '2026-03-22T17:00:00Z',
    },
    photoCaptions: [
      'Peaceful forest walking',
    ],
  },
  {
    day: 9,
    date: '2026-03-23',
    title: 'Carter Gap to Rock Gap Shelter',
    location: 'Rock Gap, NC',
    latitude: 35.1123,
    longitude: -83.4567,
    content: `Town day! Hiked down to Franklin, NC for resupply. Got a burger, fries, and ice cream. Pretty sure I ate my body weight in calories.

Resupplied at the outfitter and grabbed some blister supplies. My feet are slowly toughening up but still have some hot spots.

Back on trail feeling refreshed and motivated. The shower and laundry made me feel human again. Funny how the small things become so important out here.`,
    milesHiked: 12.8,
    elevationGain: 2200,
    weather: {
      temperature: 66,
      temperatureUnit: 'F' as const,
      conditions: 'Sunny',
      humidity: 58,
      windSpeed: 6,
      windUnit: 'mph',
      recordedAt: '2026-03-23T18:30:00Z',
    },
    photoCaptions: [
      'Back on the trail after town',
      'Fresh legs, full pack',
    ],
  },
  {
    day: 10,
    date: '2026-03-24',
    title: 'Rock Gap to Wayah Shelter',
    location: 'Wayah Bald, NC',
    latitude: 35.1756,
    longitude: -83.5589,
    content: `Double-digit day number! Feels like a real milestone. The trail is becoming my new normal.

Today was all about climbing - gained over 3,000 feet. The ascent to Wayah Bald was steep but the 360-degree views from the stone tower at the top were unbelievable. Could see the Smokies in the distance!

My hiking pace is improving. I'm covering ground faster and feeling stronger. The initial soreness is fading and being replaced by trail legs.

Starting to think less about the destination and more about enjoying each day. This is the headspace I was hoping to find out here.`,
    milesHiked: 14.3,
    elevationGain: 3200,
    weather: {
      temperature: 63,
      temperatureUnit: 'F' as const,
      conditions: 'Clear',
      humidity: 52,
      windSpeed: 8,
      windUnit: 'mph',
      recordedAt: '2026-03-24T19:00:00Z',
    },
    photoCaptions: [
      'View from Wayah Bald tower',
      'Smokies on the horizon',
    ],
  },
];

async function main() {
  console.log('🌲 Starting to seed sample journal entries...\n');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.photo.deleteMany();
  await prisma.journalEntry.deleteMany();
  console.log('✓ Cleared existing entries\n');

  let totalMiles = 0;
  let photoIndex = 0;

  // Create entries
  for (const entry of SAMPLE_ENTRIES) {
    // Training entries don't count toward trail total
    if (entry.entryType !== 'training') {
      totalMiles += entry.milesHiked;
    }

    console.log(`Creating Day ${entry.day}: ${entry.title}`);

    // Load Suunto data if specified
    let suuntoData: string | null = null;
    let actualMiles = entry.milesHiked;
    let actualElevation = entry.elevationGain;
    let actualLat = entry.latitude;
    let actualLon = entry.longitude;

    if ('suuntoFile' in entry && entry.suuntoFile) {
      try {
        // Try multiple paths to find the Suunto file (now in backend/data/)
        // Use path.resolve for cross-platform compatibility (Windows/Mac/Linux)
        const possiblePaths = [
          path.resolve(__dirname, '..', 'data', entry.suuntoFile),
          path.resolve(process.cwd(), 'data', entry.suuntoFile),
          path.resolve(process.cwd(), '..', 'webapp', 'public', entry.suuntoFile), // Legacy location fallback
        ];

        let suuntoContent: string | null = null;
        console.log(`  Looking for Suunto file: ${entry.suuntoFile}`);
        for (const filePath of possiblePaths) {
          console.log(`    Checking: ${filePath}`);
          if (fs.existsSync(filePath)) {
            console.log(`  Loading Suunto data from: ${filePath}`);
            suuntoContent = fs.readFileSync(filePath, 'utf-8');
            break;
          }
        }

        if (!suuntoContent) {
          console.log(`  ⚠ Suunto file not found in any location. Make sure ${entry.suuntoFile} exists in backend/data/`);
        }

        if (suuntoContent) {
          const parsed = parseSuuntoJson(suuntoContent);

          // Update entry with actual Suunto data
          actualMiles = parsed.distanceMiles;
          actualElevation = parsed.elevation.ascentFeet;

          // Use first GPS coordinate if available
          if (parsed.gpsTrack.length > 0) {
            actualLat = parsed.gpsTrack[0].lat;
            actualLon = parsed.gpsTrack[0].lon;
          }

          // Store parsed data (not raw file)
          suuntoData = JSON.stringify(parsed);

          console.log(`  ✓ Loaded Suunto data: ${parsed.distanceMiles} miles, ${parsed.stepCount} steps, ${parsed.heartRate.avgBpm} avg HR`);
        }
      } catch (err) {
        console.log(`  ⚠ Could not load Suunto file: ${err}`);
      }
    }

    const journalEntry = await prisma.journalEntry.create({
      data: {
        date: new Date(entry.date + 'T12:00:00Z'),
        dayNumber: entry.day,
        title: entry.title,
        content: entry.content,
        milesHiked: actualMiles,
        elevationGain: actualElevation,
        totalMilesCompleted: totalMiles,
        weather: JSON.stringify(entry.weather),
        latitude: actualLat ?? null,
        longitude: actualLon ?? null,
        locationName: entry.location ?? null,
        gpxData: null,
        suuntoData: suuntoData,
        entryType: entry.entryType ?? 'trail',
      },
    });

    // Add photos using shuffled personal photos
    for (let i = 0; i < entry.photoCaptions.length; i++) {
      const photoUrl = shuffledPhotos[photoIndex % shuffledPhotos.length];
      photoIndex++;

      await prisma.photo.create({
        data: {
          journalEntryId: journalEntry.id,
          url: photoUrl,
          caption: entry.photoCaptions[i],
          order: i,
        },
      });
    }

    console.log(`  ✓ Added ${entry.photoCaptions.length} photo(s)`);
  }

  console.log(`\n✅ Successfully created ${SAMPLE_ENTRIES.length} journal entries!`);
  console.log(`📊 Total miles: ${totalMiles.toFixed(1)}`);
  console.log(`⛰️  Total elevation gain: ${SAMPLE_ENTRIES.reduce((sum, e) => sum + e.elevationGain, 0).toLocaleString()} ft\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
