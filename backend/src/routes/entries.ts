import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import {
  createJournalEntrySchema,
  updateJournalEntrySchema,
  journalEntrySchema,
} from "../types";
import type { Context } from "hono";
import { requireAdminAuth } from "../middleware/adminAuth";
import * as fs from "fs/promises";
import * as path from "path";

const uploadsDir = path.join(process.cwd(), "public", "uploads");

const entriesRouter = new Hono();

/**
 * GET /api/entries
 * List all journal entries with pagination
 * Public endpoint - no authentication required
 */
entriesRouter.get(
  "/",
  zValidator(
    "query",
    z.object({
      page: z.string().optional().default("1"),
      pageSize: z.string().optional().default("10"),
    })
  ),
  async (c) => {

    const { page, pageSize } = c.req.valid("query");

    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    try {
      const [entries, total] = await Promise.all([
        prisma.journalEntry.findMany({
          include: { photos: true, videos: true },
          orderBy: { date: "desc" },
          skip,
          take: pageSizeNum,
        }),
        prisma.journalEntry.count(),
      ]);

      // Helper to normalize URLs to relative paths (works with proxy)
      // Only normalizes local uploads, leaves external URLs intact
      const normalizeUrl = (url: string): string => {
        // If it's already a relative URL, return as-is
        if (url.startsWith("/")) {
          return url;
        }
        // If it's an external URL (http/https), keep it as-is
        if (url.startsWith("http://") || url.startsWith("https://")) {
          return url;
        }
        // Otherwise, treat as relative path
        return url.startsWith("/") ? url : `/${url}`;
      };

      const formattedEntries = entries.map((entry) => ({
        ...entry,
        date: entry.date.toISOString(),
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
        photos: entry.photos.map((photo) => ({
          ...photo,
          url: normalizeUrl(photo.url),
          createdAt: photo.createdAt.toISOString(),
          takenAt: photo.takenAt?.toISOString() ?? null,
        })),
        videos: entry.videos.map((video) => ({
          ...video,
          url: normalizeUrl(video.url),
          thumbnailUrl: normalizeUrl(video.thumbnailUrl),
          createdAt: video.createdAt.toISOString(),
          takenAt: video.takenAt?.toISOString() ?? null,
        })),
      }));

      return c.json({
        data: {
          entries: formattedEntries,
          pagination: {
            page: pageNum,
            pageSize: pageSizeNum,
            total,
            totalPages: Math.ceil(total / pageSizeNum),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      return c.json(
        {
          error: {
            message: "Failed to fetch journal entries",
            code: "FETCH_ERROR",
          },
        },
        500
      );
    }
  }
);

/**
 * GET /api/entries/:id
 * Get a specific journal entry with photos
 * Public endpoint - no authentication required
 */
entriesRouter.get("/:id", async (c) => {

  const entryId = c.req.param("id");

  try {
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
      include: {
        photos: { orderBy: { order: "asc" } },
        videos: { orderBy: { order: "asc" } },
      },
    });

    if (!entry) {
      return c.json(
        {
          error: {
            message: "Journal entry not found",
            code: "NOT_FOUND",
          },
        },
        404
      );
    }

    // Helper to normalize URLs to relative paths (works with proxy)
    // Only normalizes local uploads, leaves external URLs intact
    const normalizeUrl = (url: string): string => {
      // If it's already a relative URL, return as-is
      if (url.startsWith("/")) {
        return url;
      }
      // If it's an external URL (http/https), keep it as-is
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
      }
      // Otherwise, treat as relative path
      return url.startsWith("/") ? url : `/${url}`;
    };

    const formattedEntry = {
      ...entry,
      date: entry.date.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      photos: entry.photos.map((photo) => ({
        ...photo,
        url: normalizeUrl(photo.url),
        createdAt: photo.createdAt.toISOString(),
        takenAt: photo.takenAt?.toISOString() ?? null,
      })),
      videos: entry.videos.map((video) => ({
        ...video,
        url: normalizeUrl(video.url),
        thumbnailUrl: normalizeUrl(video.thumbnailUrl),
        createdAt: video.createdAt.toISOString(),
        takenAt: video.takenAt?.toISOString() ?? null,
      })),
    };

    return c.json({ data: formattedEntry });
  } catch (error) {
    console.error("Error fetching journal entry:", error);
    return c.json(
      {
        error: {
          message: "Failed to fetch journal entry",
          code: "FETCH_ERROR",
        },
      },
      500
    );
  }
});

/**
 * POST /api/entries
 * Create a new journal entry
 */
entriesRouter.post(
  "/",
  zValidator("json", createJournalEntrySchema),
  async (c) => {
    const authError = requireAdminAuth(c);
    if (authError) return authError;

    const data = c.req.valid("json");

    try {
      const entry = await prisma.journalEntry.create({
        data: {
          ...data,
          date: new Date(data.date),
        },
        include: { photos: true },
      });

      const formattedEntry = {
        ...entry,
        date: entry.date.toISOString(),
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
        photos: entry.photos.map((photo) => ({
          ...photo,
          createdAt: photo.createdAt.toISOString(),
        })),
      };

      return c.json({ data: formattedEntry }, 201);
    } catch (error) {
      console.error("Error creating journal entry:", error);
      return c.json(
        {
          error: {
            message: "Failed to create journal entry",
            code: "CREATE_ERROR",
          },
        },
        500
      );
    }
  }
);

/**
 * PUT /api/entries/:id
 * Update an existing journal entry
 */
entriesRouter.put(
  "/:id",
  zValidator("json", updateJournalEntrySchema),
  async (c) => {
    const authError = requireAdminAuth(c);
    if (authError) return authError;

    const entryId = c.req.param("id");
    const data = c.req.valid("json");

    try {
      // Check if entry exists
      const existingEntry = await prisma.journalEntry.findUnique({
        where: { id: entryId },
      });

      if (!existingEntry) {
        return c.json(
          {
            error: {
              message: "Journal entry not found",
              code: "NOT_FOUND",
            },
          },
          404
        );
      }

      const updateData: any = { ...data };
      if (data.date) {
        updateData.date = new Date(data.date);
      }

      const entry = await prisma.journalEntry.update({
        where: { id: entryId },
        data: updateData,
        include: {
          photos: { orderBy: { order: "asc" } },
          videos: { orderBy: { order: "asc" } },
        },
      });

      // Helper to normalize URLs to relative paths (works with proxy)
      // Only normalizes local uploads, leaves external URLs intact
      const normalizeUrl = (url: string): string => {
        // If it's already a relative URL, return as-is
        if (url.startsWith("/")) {
          return url;
        }
        // If it's an external URL (http/https), keep it as-is
        if (url.startsWith("http://") || url.startsWith("https://")) {
          return url;
        }
        // Otherwise, treat as relative path
        return url.startsWith("/") ? url : `/${url}`;
      };

      const formattedEntry = {
        ...entry,
        date: entry.date.toISOString(),
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
        photos: entry.photos.map((photo) => ({
          ...photo,
          url: normalizeUrl(photo.url),
          createdAt: photo.createdAt.toISOString(),
          takenAt: photo.takenAt?.toISOString() ?? null,
        })),
        videos: entry.videos.map((video) => ({
          ...video,
          url: normalizeUrl(video.url),
          thumbnailUrl: normalizeUrl(video.thumbnailUrl),
          createdAt: video.createdAt.toISOString(),
          takenAt: video.takenAt?.toISOString() ?? null,
        })),
      };

      return c.json({ data: formattedEntry });
    } catch (error) {
      console.error("Error updating journal entry:", error);
      return c.json(
        {
          error: {
            message: "Failed to update journal entry",
            code: "UPDATE_ERROR",
          },
        },
        500
      );
    }
  }
);

/**
 * DELETE /api/entries/:id
 * Delete a journal entry (and its photos via cascade)
 */
entriesRouter.delete("/:id", async (c) => {
  const authError = requireAdminAuth(c);
  if (authError) return authError;

  const entryId = c.req.param("id");

  try {
    // Check if entry exists and get its photos and videos
    const existingEntry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
      include: { photos: true, videos: true },
    });

    if (!existingEntry) {
      return c.json(
        {
          error: {
            message: "Journal entry not found",
            code: "NOT_FOUND",
          },
        },
        404
      );
    }

    // Delete photo files from disk
    for (const photo of existingEntry.photos) {
      if (photo.url.includes("/public/uploads/")) {
        try {
          const filename = photo.url.split("/public/uploads/")[1];
          if (filename) {
            const filepath = path.join(uploadsDir, filename);
            await fs.unlink(filepath).catch((err) => {
              console.warn(`[entries] Could not delete file ${filepath}:`, err.message);
            });
          }
        } catch (fileError) {
          console.warn("[entries] Error deleting photo file:", fileError);
        }
      }
    }

    // Delete video and thumbnail files from disk
    for (const video of existingEntry.videos) {
      if (video.url.includes("/public/uploads/")) {
        try {
          const filename = video.url.split("/public/uploads/")[1];
          if (filename) {
            const filepath = path.join(uploadsDir, filename);
            await fs.unlink(filepath).catch((err) => {
              console.warn(`[entries] Could not delete video file ${filepath}:`, err.message);
            });
          }
        } catch (fileError) {
          console.warn("[entries] Error deleting video file:", fileError);
        }
      }
      if (video.thumbnailUrl.includes("/public/uploads/")) {
        try {
          const filename = video.thumbnailUrl.split("/public/uploads/")[1];
          if (filename) {
            const filepath = path.join(uploadsDir, filename);
            await fs.unlink(filepath).catch((err) => {
              console.warn(`[entries] Could not delete thumbnail file ${filepath}:`, err.message);
            });
          }
        } catch (fileError) {
          console.warn("[entries] Error deleting thumbnail file:", fileError);
        }
      }
    }

    // Delete entry (photos and videos cascade automatically in DB)
    await prisma.journalEntry.delete({
      where: { id: entryId },
    });

    console.log(`[entries] Deleted entry ${entryId} with ${existingEntry.photos.length} photos and ${existingEntry.videos.length} videos`);

    return c.body(null, 204);
  } catch (error) {
    console.error("Error deleting journal entry:", error);
    return c.json(
      {
        error: {
          message: "Failed to delete journal entry",
          code: "DELETE_ERROR",
        },
      },
      500
    );
  }
});

export { entriesRouter };
