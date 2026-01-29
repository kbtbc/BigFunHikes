import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../prisma";
import { updateVideoSchema } from "../types";
import { requireAdminAuth } from "../middleware/adminAuth";
import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";

// Configure ffmpeg paths
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}
ffmpeg.setFfprobePath(ffprobeInstaller.path);

interface VideoMetadata {
  duration: number; // seconds
  latitude?: number;
  longitude?: number;
  takenAt?: Date;
}

// Max video duration: 120 seconds
const MAX_VIDEO_DURATION = 120;
// Max file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Extract metadata from video file using ffprobe
 */
async function extractVideoMetadata(filepath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) {
        console.error("[videos] ffprobe error:", err);
        reject(err);
        return;
      }

      const duration = Math.round(metadata.format.duration || 0);
      const result: VideoMetadata = { duration };

      // Try to extract GPS from metadata tags
      const tags = metadata.format.tags || {};

      // Common GPS tag formats from different devices
      // iPhone: com.apple.quicktime.location.ISO6709
      // Android: location
      const locationTag = tags["com.apple.quicktime.location.ISO6709"] ||
                         tags["location"] ||
                         tags["com.android.location"];

      if (locationTag && typeof locationTag === 'string') {
        // Parse ISO 6709 format: +DD.DDDD-DDD.DDDD/ or similar
        const match = locationTag.match(/([+-]?\d+\.?\d*?)([+-]\d+\.?\d*)/);
        if (match && match[1] && match[2]) {
          result.latitude = parseFloat(match[1]);
          result.longitude = parseFloat(match[2]);
          console.log("[videos] Extracted GPS:", { lat: result.latitude, lon: result.longitude });
        }
      }

      // Try to extract creation date
      const creationTime = tags["creation_time"] ||
                          tags["com.apple.quicktime.creationdate"] ||
                          tags["date"];

      if (creationTime && typeof creationTime === 'string') {
        try {
          result.takenAt = new Date(creationTime);
          console.log("[videos] Extracted creation time:", result.takenAt);
        } catch {
          // Invalid date, skip
        }
      }

      console.log("[videos] Extracted metadata:", {
        duration: result.duration,
        hasGps: !!(result.latitude && result.longitude),
        hasDate: !!result.takenAt
      });

      resolve(result);
    });
  });
}

/**
 * Generate thumbnail from video at ~1 second mark
 */
async function generateThumbnail(videoPath: string, thumbnailPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ["00:00:01"],
        filename: path.basename(thumbnailPath),
        folder: path.dirname(thumbnailPath),
        size: "640x?"  // 640px width, auto height to maintain aspect ratio
      })
      .on("end", () => {
        console.log("[videos] Thumbnail generated:", thumbnailPath);
        resolve();
      })
      .on("error", (err) => {
        console.error("[videos] Thumbnail generation error:", err);
        reject(err);
      });
  });
}

const videosRouter = new Hono();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "public", "uploads");
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

/**
 * POST /api/entries/:id/videos/upload
 * Upload a video file to a journal entry
 */
videosRouter.post("/:id/videos/upload", async (c) => {
  const authError = requireAdminAuth(c);
  if (authError) {
    return authError;
  }

  const entryId = c.req.param("id");

  try {
    // Verify that the journal entry exists
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
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

    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get("file");
    const caption = formData.get("caption") as string | null;
    const order = formData.get("order") as string | null;

    // Validation
    if (!file || !(file instanceof File)) {
      return c.json(
        {
          error: {
            message: "No file provided",
            code: "MISSING_FILE",
          },
        },
        400
      );
    }

    if (!order) {
      return c.json(
        {
          error: {
            message: "Order field is required",
            code: "MISSING_ORDER",
          },
        },
        400
      );
    }

    // Validate file type
    const validVideoTypes = [
      "video/mp4",
      "video/quicktime", // MOV
      "video/webm",
      "video/x-m4v",
    ];
    if (!validVideoTypes.includes(file.type)) {
      console.log("[videos] Invalid file type:", file.type, "for file:", file.name);
      return c.json(
        {
          error: {
            message: `Invalid file type: ${file.type}. Only MP4, MOV, WebM, and M4V videos are allowed`,
            code: "INVALID_FILE_TYPE",
          },
        },
        400
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return c.json(
        {
          error: {
            message: "File size exceeds 100MB limit",
            code: "FILE_TOO_LARGE",
          },
        },
        400
      );
    }

    // Generate unique filenames
    const uuid = randomUUID();
    const fileExt = file.name.split(".").pop() || "mp4";
    const videoFilename = `${uuid}.${fileExt}`;
    const thumbnailFilename = `${uuid}_thumb.jpg`;
    const videoPath = path.join(uploadsDir, videoFilename);
    const thumbnailPath = path.join(uploadsDir, thumbnailFilename);

    // Convert file to buffer and write to disk
    const buffer = await file.arrayBuffer();
    await fs.writeFile(videoPath, new Uint8Array(buffer));

    // Extract video metadata
    let metadata: VideoMetadata;
    try {
      metadata = await extractVideoMetadata(videoPath);
    } catch (metaErr) {
      // Clean up the video file if metadata extraction fails
      await fs.unlink(videoPath).catch(() => {});
      console.error("[videos] Metadata extraction failed:", metaErr);
      return c.json(
        {
          error: {
            message: "Failed to process video file. Please ensure it's a valid video.",
            code: "INVALID_VIDEO",
          },
        },
        400
      );
    }

    // Validate duration
    if (metadata.duration > MAX_VIDEO_DURATION) {
      // Clean up the video file
      await fs.unlink(videoPath).catch(() => {});
      return c.json(
        {
          error: {
            message: `Video duration (${metadata.duration}s) exceeds maximum allowed (${MAX_VIDEO_DURATION}s)`,
            code: "VIDEO_TOO_LONG",
          },
        },
        400
      );
    }

    // Generate thumbnail
    try {
      await generateThumbnail(videoPath, thumbnailPath);
    } catch (thumbErr) {
      // Clean up the video file if thumbnail generation fails
      await fs.unlink(videoPath).catch(() => {});
      console.error("[videos] Thumbnail generation failed:", thumbErr);
      return c.json(
        {
          error: {
            message: "Failed to generate video thumbnail",
            code: "THUMBNAIL_ERROR",
          },
        },
        500
      );
    }

    // Construct relative URLs (will be served by backend)
    const videoUrl = `/public/uploads/${videoFilename}`;
    const thumbnailUrl = `/public/uploads/${thumbnailFilename}`;

    // Parse order as number
    let orderNum: number;
    try {
      orderNum = parseInt(order, 10);
      if (isNaN(orderNum) || orderNum < 0) {
        throw new Error();
      }
    } catch {
      // Clean up files
      await fs.unlink(videoPath).catch(() => {});
      await fs.unlink(thumbnailPath).catch(() => {});
      return c.json(
        {
          error: {
            message: "Order must be a non-negative integer",
            code: "INVALID_ORDER",
          },
        },
        400
      );
    }

    // Create video record in database
    const video = await prisma.video.create({
      data: {
        url: videoUrl,
        thumbnailUrl: thumbnailUrl,
        duration: metadata.duration,
        caption: caption || null,
        order: orderNum,
        journalEntryId: entryId,
        latitude: metadata.latitude ?? null,
        longitude: metadata.longitude ?? null,
        takenAt: metadata.takenAt ?? null,
      },
    });

    console.log("[videos] Created video with metadata:", {
      id: video.id,
      duration: video.duration,
      latitude: video.latitude,
      longitude: video.longitude,
      takenAt: video.takenAt,
    });

    const formattedVideo = {
      ...video,
      createdAt: video.createdAt.toISOString(),
      takenAt: video.takenAt?.toISOString() ?? null,
    };

    return c.json({ data: formattedVideo }, 201);
  } catch (error) {
    console.error("[videos] Error uploading video:", error);
    return c.json(
      {
        error: {
          message: "Failed to upload video",
          code: "UPLOAD_ERROR",
        },
      },
      500
    );
  }
});

/**
 * PATCH /api/entries/:id/videos/:videoId
 * Update a video's caption
 */
videosRouter.patch(
  "/:id/videos/:videoId",
  zValidator("json", updateVideoSchema),
  async (c) => {
    const authError = requireAdminAuth(c);
    if (authError) return authError;

    const entryId = c.req.param("id");
    const videoId = c.req.param("videoId");
    const data = c.req.valid("json");

    try {
      // Find the video
      const video = await prisma.video.findUnique({
        where: { id: videoId },
      });

      if (!video) {
        return c.json(
          {
            error: {
              message: "Video not found",
              code: "NOT_FOUND",
            },
          },
          404
        );
      }

      // Verify the video belongs to this entry
      if (video.journalEntryId !== entryId) {
        return c.json(
          {
            error: {
              message: "Video does not belong to this journal entry",
              code: "INVALID_RELATIONSHIP",
            },
          },
          400
        );
      }

      // Update the video
      const updatedVideo = await prisma.video.update({
        where: { id: videoId },
        data: {
          caption: data.caption,
        },
      });

      const formattedVideo = {
        ...updatedVideo,
        createdAt: updatedVideo.createdAt.toISOString(),
        takenAt: updatedVideo.takenAt?.toISOString() ?? null,
      };

      return c.json({ data: formattedVideo });
    } catch (error) {
      console.error("Error updating video:", error);
      return c.json(
        {
          error: {
            message: "Failed to update video",
            code: "UPDATE_ERROR",
          },
        },
        500
      );
    }
  }
);

/**
 * DELETE /api/entries/:id/videos/:videoId
 * Delete a video from a journal entry
 */
videosRouter.delete("/:id/videos/:videoId", async (c) => {
  const authError = requireAdminAuth(c);
  if (authError) return authError;

  const entryId = c.req.param("id");
  const videoId = c.req.param("videoId");

  try {
    // Verify that the journal entry exists
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
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

    // Find the video
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return c.json(
        {
          error: {
            message: "Video not found",
            code: "NOT_FOUND",
          },
        },
        404
      );
    }

    // Verify the video belongs to this entry
    if (video.journalEntryId !== entryId) {
      return c.json(
        {
          error: {
            message: "Video does not belong to this journal entry",
            code: "INVALID_RELATIONSHIP",
          },
        },
        400
      );
    }

    // Delete the video and thumbnail files
    if (video.url.includes("/public/uploads/")) {
      try {
        const videoFilename = video.url.split("/public/uploads/")[1];
        if (videoFilename) {
          const videoPath = path.join(uploadsDir, videoFilename);
          await fs.unlink(videoPath).catch((err) => {
            console.warn(`[videos] Could not delete video file ${videoPath}:`, err);
          });
        }
      } catch (fileError) {
        console.warn("[videos] Error deleting video file:", fileError);
      }
    }

    if (video.thumbnailUrl.includes("/public/uploads/")) {
      try {
        const thumbFilename = video.thumbnailUrl.split("/public/uploads/")[1];
        if (thumbFilename) {
          const thumbPath = path.join(uploadsDir, thumbFilename);
          await fs.unlink(thumbPath).catch((err) => {
            console.warn(`[videos] Could not delete thumbnail file ${thumbPath}:`, err);
          });
        }
      } catch (fileError) {
        console.warn("[videos] Error deleting thumbnail file:", fileError);
      }
    }

    // Delete the video record from database
    await prisma.video.delete({
      where: { id: videoId },
    });

    return c.body(null, 204);
  } catch (error) {
    console.error("Error deleting video:", error);
    return c.json(
      {
        error: {
          message: "Failed to delete video",
          code: "DELETE_ERROR",
        },
      },
      500
    );
  }
});

export { videosRouter };
