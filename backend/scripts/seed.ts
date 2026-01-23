import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Unsplash stock hiking photos
const stockPhotos = [
  "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
  "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800",
  "https://images.unsplash.com/photo-1682686581384-2db4f970b1e7?w=800",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
];

const sampleEntries = [
  {
    dayNumber: 1,
    title: "Springer Mountain - The Journey Begins!",
    content: `# Day 1: First Steps

The moment I'd been dreaming about for years finally arrived. Standing at Springer Mountain's summit at sunrise, looking at the white blazes stretching north for 2,190 miles.

The trail was muddy from recent rain, but nothing could dampen my spirits. Every step felt significant, like I was walking into a new chapter of my life.

## Highlights
- Met a few other thru-hikers at the summit
- Saw my first white-tailed deer
- Made it to Hawk Mountain Shelter just before sunset

The shelter was packed, but everyone was friendly and excited. Shared stories around dinner, comparing gear and exchanging contact info.

Tomorrow: Push on towards Neel Gap!`,
    milesHiked: 8.3,
    elevationGain: 1450,
    photoIndex: 0,
  },
  {
    dayNumber: 2,
    title: "Blood Mountain - Testing My Limits",
    content: `# Day 2: The Real Challenge Begins

Blood Mountain lived up to its reputation. The climb was brutal, but the views from the top made every painful step worth it.

My pack felt heavier today - think I might need to do some gear adjustments at Neel Gap. The uphills are no joke.

## Trail Conditions
- Rocky and technical in sections
- Some ice near the summit
- Beautiful views above the tree line

Made it to Neel Gap by 3 PM. Got my pack weight down by shipping home some unnecessary gear. Feeling much better about the days ahead.

The outfitter staff were super helpful and gave me some great tips for the upcoming section.`,
    milesHiked: 11.7,
    elevationGain: 2380,
    photoIndex: 1,
  },
  {
    dayNumber: 3,
    title: "Into North Carolina - State #2",
    content: `# Day 3: Crossing State Lines

Crossed into North Carolina today! One state down, 13 to go.

The terrain mellowed out a bit, which gave my legs a much-needed break. Focused on finding my hiking rhythm and not pushing too hard too early.

## What I'm Learning
- Slow and steady really does win the race
- Proper foot care is EVERYTHING
- Trail magic is real and amazing

Found a cooler of drinks and snacks at a road crossing. Trail angels are the best! Left a thank you note and donation.

Camped near a beautiful stream. The sound of running water is the perfect lullaby.`,
    milesHiked: 14.2,
    elevationGain: 1680,
    photoIndex: 2,
  },
];

async function main() {
  console.log("🗑️  Clearing database...");

  // Delete all data
  await prisma.photo.deleteMany();
  await prisma.journalEntry.deleteMany();

  console.log("✅ Database cleared");

  console.log("📝 Creating sample entries...");

  let totalMiles = 0;

  for (const entry of sampleEntries) {
    totalMiles += entry.milesHiked;

    // Calculate date (starting from today minus number of days)
    const entryDate = new Date();
    entryDate.setDate(entryDate.getDate() - (sampleEntries.length - entry.dayNumber));
    entryDate.setHours(12, 0, 0, 0); // Set to noon

    const journalEntry = await prisma.journalEntry.create({
      data: {
        dayNumber: entry.dayNumber,
        date: entryDate,
        title: entry.title,
        content: entry.content,
        milesHiked: entry.milesHiked,
        elevationGain: entry.elevationGain,
        totalMilesCompleted: totalMiles,
        gpxData: null,
      },
    });

    // Add 2-3 photos per entry
    const photoCount = Math.floor(Math.random() * 2) + 2; // 2 or 3 photos
    for (let i = 0; i < photoCount; i++) {
      const photoIndex = (entry.photoIndex + i) % stockPhotos.length;
      await prisma.photo.create({
        data: {
          journalEntryId: journalEntry.id,
          url: stockPhotos[photoIndex],
          caption: i === 0 ? `View from Day ${entry.dayNumber}` : null,
          order: i,
        },
      });
    }

    console.log(`✅ Created entry: Day ${entry.dayNumber} - ${entry.title}`);
  }

  console.log("\n🎉 Database reset complete!");
  console.log(`📊 Created ${sampleEntries.length} journal entries`);
  console.log(`🏔️  Total miles: ${totalMiles.toFixed(1)} miles`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
