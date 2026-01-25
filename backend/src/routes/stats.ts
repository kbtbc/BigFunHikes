import { Hono } from "hono";
import { prisma } from "../prisma";
import type { Context } from "hono";
import { requireAdminAuth } from "../middleware/adminAuth";

const statsRouter = new Hono();

/**
 * GET /api/stats
 * Get overall hiking statistics
 * Public endpoint - no authentication required
 */
statsRouter.get("/", async (c) => {

  try {
    // Get all journal entries
    const entries = await prisma.journalEntry.findMany({
      orderBy: { date: "asc" }, // Changed to ascending for time-series calculations
    });

    if (entries.length === 0) {
      return c.json({
        data: {
          totalMiles: 0,
          totalDays: 0,
          totalElevationGain: 0,
          averageMilesPerDay: 0,
          lastEntryDate: null,
          // Enhanced stats
          longestDay: null,
          biggestClimb: null,
          currentStreak: 0,
          percentComplete: 0,
          projectedCompletionDate: null,
          daysRemaining: null,
          recentPace: 0,
          elevationProfile: [],
        },
      });
    }

    // Basic statistics
    const totalMiles = entries.reduce((sum, entry) => sum + entry.milesHiked, 0);
    const totalDays = entries.length;
    const totalElevationGain = entries.reduce(
      (sum, entry) => sum + (entry.elevationGain || 0),
      0
    );
    const averageMilesPerDay = totalMiles / totalDays;
    const lastEntryDate = entries[entries.length - 1]?.date.toISOString() || null;

    // Enhanced statistics
    const AT_TOTAL_MILES = 2190; // Total Appalachian Trail miles
    const percentComplete = (totalMiles / AT_TOTAL_MILES) * 100;

    // Find longest day (by miles)
    const longestDayEntry = entries.reduce((max, entry) =>
      entry.milesHiked > max.milesHiked ? entry : max
    , entries[0]);
    const longestDay = {
      miles: longestDayEntry.milesHiked,
      date: longestDayEntry.date.toISOString(),
      title: longestDayEntry.title,
    };

    // Find biggest climb (by elevation)
    const biggestClimbEntry = entries.reduce((max, entry) =>
      (entry.elevationGain || 0) > (max.elevationGain || 0) ? entry : max
    , entries[0]);
    const biggestClimb = {
      elevation: biggestClimbEntry.elevationGain || 0,
      date: biggestClimbEntry.date.toISOString(),
      title: biggestClimbEntry.title,
    };

    // Calculate current streak (consecutive days)
    let currentStreak = 0;
    for (let i = entries.length - 1; i >= 0; i--) {
      const currentDate = new Date(entries[i].date);
      const nextDate = i < entries.length - 1 ? new Date(entries[i + 1].date) : null;

      if (nextDate) {
        const diffDays = Math.floor((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      } else {
        currentStreak = 1; // Start with the most recent day
      }
    }

    // Calculate recent pace (last 7 days or all days if less than 7)
    const recentEntries = entries.slice(-7);
    const recentMiles = recentEntries.reduce((sum, entry) => sum + entry.milesHiked, 0);
    const recentPace = recentMiles / recentEntries.length;

    // Project completion date based on recent pace
    const milesRemaining = AT_TOTAL_MILES - totalMiles;
    const daysRemaining = recentPace > 0 ? Math.ceil(milesRemaining / recentPace) : null;

    let projectedCompletionDate = null;
    if (daysRemaining && lastEntryDate) {
      const lastDate = new Date(lastEntryDate);
      const projectedDate = new Date(lastDate);
      projectedDate.setDate(projectedDate.getDate() + daysRemaining);
      projectedCompletionDate = projectedDate.toISOString();
    }

    // Build elevation profile (daily elevation gain for charting)
    const elevationProfile = entries.map(entry => ({
      date: entry.date.toISOString(),
      dayNumber: entry.dayNumber,
      elevation: entry.elevationGain || 0,
      miles: entry.milesHiked,
    }));

    return c.json({
      data: {
        // Basic stats
        totalMiles,
        totalDays,
        totalElevationGain,
        averageMilesPerDay,
        lastEntryDate,
        // Enhanced stats
        longestDay,
        biggestClimb,
        currentStreak,
        percentComplete,
        projectedCompletionDate,
        daysRemaining,
        recentPace,
        elevationProfile,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return c.json(
      {
        error: {
          message: "Failed to fetch statistics",
          code: "FETCH_ERROR",
        },
      },
      500
    );
  }
});

export { statsRouter };
