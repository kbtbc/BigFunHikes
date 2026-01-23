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
      orderBy: { date: "desc" },
    });

    if (entries.length === 0) {
      return c.json({
        data: {
          totalMiles: 0,
          totalDays: 0,
          totalElevationGain: 0,
          averageMilesPerDay: 0,
          lastEntryDate: null,
        },
      });
    }

    // Calculate statistics
    const totalMiles = entries.reduce((sum, entry) => sum + entry.milesHiked, 0);
    const totalDays = entries.length;
    const totalElevationGain = entries.reduce(
      (sum, entry) => sum + (entry.elevationGain || 0),
      0
    );
    const averageMilesPerDay = totalMiles / totalDays;
    const lastEntryDate = entries[0]?.date.toISOString() || null;

    return c.json({
      data: {
        totalMiles,
        totalDays,
        totalElevationGain,
        averageMilesPerDay,
        lastEntryDate,
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
