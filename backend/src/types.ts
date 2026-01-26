import { z } from "zod";

// ============================================================
// JOURNAL ENTRY SCHEMAS
// ============================================================

/**
 * Entry type enum - "trail" for regular AT hiking, "training" for pre-hike training
 */
export const entryTypeSchema = z.enum(["trail", "training"]);
export type EntryType = z.infer<typeof entryTypeSchema>;

/**
 * Schema for creating a new journal entry
 * Training entries can use dayNumber <= 0 to indicate pre-hike training
 */
export const createJournalEntrySchema = z.object({
  date: z.string().datetime(),
  dayNumber: z.number().int(), // Allow 0 or negative for training entries
  title: z.string().min(1).max(500),
  content: z.string(),
  milesHiked: z.number().nonnegative(),
  elevationGain: z.number().int().nullable().optional(),
  totalMilesCompleted: z.number().nonnegative(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  locationName: z.string().max(500).nullable().optional(),
  weather: z.string().nullable().optional(), // JSON string of weather data
  gpxData: z.string().nullable().optional(),
  suuntoData: z.string().nullable().optional(), // JSON string of parsed Suunto watch data
  entryType: entryTypeSchema.optional().default("trail"),
});

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;

/**
 * Schema for updating an existing journal entry
 */
export const updateJournalEntrySchema = z.object({
  date: z.string().datetime().optional(),
  dayNumber: z.number().int().optional(), // Allow 0 or negative for training entries
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  milesHiked: z.number().nonnegative().optional(),
  elevationGain: z.number().int().nullable().optional(),
  totalMilesCompleted: z.number().nonnegative().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  locationName: z.string().max(500).nullable().optional(),
  weather: z.string().nullable().optional(), // JSON string of weather data
  gpxData: z.string().nullable().optional(),
  suuntoData: z.string().nullable().optional(), // JSON string of parsed Suunto watch data
  entryType: entryTypeSchema.optional(),
});

export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;

/**
 * Schema for a photo within a journal entry
 */
export const photoSchema = z.object({
  id: z.string().uuid(),
  journalEntryId: z.string().uuid(),
  url: z.string(),
  caption: z.string().nullable(),
  order: z.number().int().nonnegative(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  takenAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});

export type Photo = z.infer<typeof photoSchema>;

/**
 * Schema for a journal entry (response)
 */
export const journalEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  date: z.string().datetime(),
  dayNumber: z.number().int(), // Allow 0 or negative for training entries
  title: z.string(),
  content: z.string(),
  milesHiked: z.number(),
  elevationGain: z.number().int().nullable(),
  totalMilesCompleted: z.number(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  locationName: z.string().nullable(),
  weather: z.string().nullable(), // JSON string of weather data
  gpxData: z.string().nullable(),
  suuntoData: z.string().nullable(), // JSON string of parsed Suunto watch data
  entryType: entryTypeSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  photos: z.array(photoSchema).optional(),
});

export type JournalEntry = z.infer<typeof journalEntrySchema>;

/**
 * Schema for weather data stored in entries
 */
export const weatherDataSchema = z.object({
  temperature: z.number(),
  temperatureUnit: z.enum(["F", "C"]),
  conditions: z.string(),
  weatherCode: z.number().optional(),
  humidity: z.number().optional(),
  windSpeed: z.number().optional(),
  windUnit: z.string().optional(),
  recordedAt: z.string().datetime(),
});

export type WeatherData = z.infer<typeof weatherDataSchema>;

/**
 * Schema for paginated journal entries list
 */
export const journalEntriesListSchema = z.object({
  entries: z.array(journalEntrySchema),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export type JournalEntriesList = z.infer<typeof journalEntriesListSchema>;

// ============================================================
// PHOTO SCHEMAS
// ============================================================

/**
 * Schema for adding a photo to a journal entry
 */
export const createPhotoSchema = z.object({
  url: z.string().url(),
  caption: z.string().max(500).nullable().optional(),
  order: z.number().int().nonnegative(),
});

export type CreatePhotoInput = z.infer<typeof createPhotoSchema>;

/**
 * Schema for uploading a photo file to a journal entry
 */
export const uploadPhotoSchema = z.object({
  caption: z.string().max(500).nullable().optional(),
  order: z.coerce.number().int().nonnegative(),
});

export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>;

/**
 * Schema for updating a photo's caption
 */
export const updatePhotoSchema = z.object({
  caption: z.string().max(500).nullable().optional(),
});

export type UpdatePhotoInput = z.infer<typeof updatePhotoSchema>;

// ============================================================
// STATS SCHEMAS
// ============================================================

/**
 * Schema for overall hiking statistics
 */
export const statsSchema = z.object({
  // Basic stats
  totalMiles: z.number().nonnegative(),
  totalDays: z.number().int().nonnegative(),
  totalElevationGain: z.number().int().nonnegative(),
  averageMilesPerDay: z.number().nonnegative(),
  lastEntryDate: z.string().datetime().nullable(),
  // Enhanced stats
  longestDay: z.object({
    miles: z.number(),
    date: z.string().datetime(),
    title: z.string(),
  }).nullable(),
  biggestClimb: z.object({
    elevation: z.number(),
    date: z.string().datetime(),
    title: z.string(),
  }).nullable(),
  currentStreak: z.number().int().nonnegative(),
  percentComplete: z.number().nonnegative(),
  projectedCompletionDate: z.string().datetime().nullable(),
  daysRemaining: z.number().int().nullable(),
  recentPace: z.number().nonnegative(),
  elevationProfile: z.array(z.object({
    date: z.string().datetime(),
    dayNumber: z.number().int(),
    elevation: z.number(),
    miles: z.number(),
  })),
});

export type Stats = z.infer<typeof statsSchema>;

// ============================================================
// ERROR SCHEMAS
// ============================================================

/**
 * Standard error response schema
 */
export const errorSchema = z.object({
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
  }),
});

export type ErrorResponse = z.infer<typeof errorSchema>;
