export interface WeatherInfo {
  temperature: number;
  temperatureUnit: "F" | "C";
  conditions: string;
  weatherCode?: number;
  humidity?: number;
  windSpeed?: number;
  windUnit?: string;
  recordedAt: string;
}

export interface JournalEntry {
  id: string;
  day: number;
  date: string;
  createdAt?: string; // Timestamp when entry was created/posted
  title: string;
  content: string;
  miles: number;
  elevationGain: number;
  totalMiles: number;
  location: {
    start: string;
    end: string;
  };
  coordinates: {
    start: [number, number]; // [lat, lng]
    end: [number, number];
  };
  photos: Array<{
    url: string;
    caption: string;
  }>;
  gpxTrack?: Array<[number, number]>; // Array of [lat, lng] coordinates
  weather?: WeatherInfo; // Weather at time of entry
  locationName?: string; // Human-readable location name
}

export const TOTAL_AT_MILES = 2190;

export const mockJournalEntries: JournalEntry[] = [
  {
    id: "day-1",
    day: 1,
    date: "2025-03-15",
    title: "Springer Mountain to Hawk Mountain Shelter",
    content: `# The Journey Begins

Today I took my first steps on the Appalachian Trail. Standing at the summit of Springer Mountain with my hand on the bronze plaque, I felt a mix of excitement and nervous energy that's hard to describe.

The morning started early - 6 AM at Amicalola Falls. The approach trail was no joke, but it served as a perfect warm-up for what's to come. By the time I reached the actual AT terminus, my legs were already feeling the weight of my pack.

## The Trail

The first day is everything I hoped it would be. The forest is alive with early spring - rhododendrons beginning to bud, and the occasional wildflower pushing through the leaf litter. The trail is well-marked, and I'm grateful for the white blazes guiding me north.

The climb to Hawk Mountain Shelter was steady but manageable. I'm glad I spent months training for this. Meeting other thru-hikers at the shelter tonight has been incredible - everyone sharing stories, trail names starting to emerge, and the camaraderie is already strong.

## Lessons Learned

- My pack is still too heavy. Already planning to send home a few "just in case" items at the next mail drop.
- Trail runners feel great, glad I ditched the heavy boots during training.
- Water sources are plentiful so far, but I'm staying vigilant about treatment.

Tomorrow: pushing on to Gooch Gap. One day down, many more to go. The adventure has truly begun.

*"The journey of a thousand miles begins with a single step." - And today, I took 7.8 miles worth of them.*`,
    miles: 7.8,
    elevationGain: 1200,
    totalMiles: 7.8,
    location: {
      start: "Springer Mountain",
      end: "Hawk Mountain Shelter",
    },
    coordinates: {
      start: [34.6266, -84.1934], // Springer Mountain
      end: [34.6344, -84.1564], // Hawk Mountain Shelter (approximate)
    },
    photos: [
      {
        url: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=1200&auto=format&fit=crop",
        caption: "Springer Mountain Summit - Mile 0 of the Appalachian Trail",
      },
      {
        url: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=1200&auto=format&fit=crop",
        caption: "The trail stretches north through Georgia's mountains",
      },
    ],
    gpxTrack: [
      [34.6266, -84.1934],
      [34.6280, -84.1920],
      [34.6295, -84.1900],
      [34.6310, -84.1875],
      [34.6320, -84.1850],
      [34.6330, -84.1800],
      [34.6340, -84.1750],
      [34.6344, -84.1564],
    ],
  },
];

export const trailStats = {
  totalMiles: TOTAL_AT_MILES,
  milesCompleted: 7.8,
  percentComplete: (7.8 / TOTAL_AT_MILES) * 100,
  daysOnTrail: 1,
  averageDailyMiles: 7.8,
  totalElevationGain: 1200,
  estimatedDaysRemaining: Math.ceil((TOTAL_AT_MILES - 7.8) / 7.8),
};
