import * as fs from "fs/promises";
import * as path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { prisma } from "../prisma";

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

/**
 * Extract metadata from video file using ffprobe
 */
export async function extractVideoMetadata(filepath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) {
        console.error("[video-processor] ffprobe error:", err);
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
          console.log("[video-processor] Extracted GPS:", { lat: result.latitude, lon: result.longitude });
        }
      }

      // Try to extract creation date
      const creationTime = tags["creation_time"] ||
                          tags["com.apple.quicktime.creationdate"] ||
                          tags["date"];

      if (creationTime && typeof creationTime === 'string') {
        try {
          result.takenAt = new Date(creationTime);
          console.log("[video-processor] Extracted creation time:", result.takenAt);
        } catch {
          // Invalid date, skip
        }
      }

      resolve(result);
    });
  });
}

/**
 * Generate thumbnail from video at ~1 second mark
 */
export async function generateThumbnail(videoPath: string, thumbnailPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ["00:00:01"],
        filename: path.basename(thumbnailPath),
        folder: path.dirname(thumbnailPath),
        size: "640x?"  // 640px width, auto height to maintain aspect ratio
      })
      .on("end", () => {
        console.log("[video-processor] Thumbnail generated:", thumbnailPath);
        resolve();
      })
      .on("error", (err) => {
        console.error("[video-processor] Thumbnail generation error:", err);
        reject(err);
      });
  });
}

/**
 * Transcode video to H.264/AAC MP4 for universal browser compatibility
 */
export async function transcodeToH264(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("[video-processor] Starting H.264 transcode:", inputPath, "->", outputPath);

    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset fast',      // Balance between speed and quality
        '-crf 23',           // Quality level (18-28, lower = better)
        '-movflags +faststart', // Enable streaming
        '-pix_fmt yuv420p',  // Ensure compatibility
      ])
      .output(outputPath)
      .on("start", (cmd) => {
        console.log("[video-processor] FFmpeg command:", cmd);
      })
      .on("progress", (progress) => {
        // Optional: log progress periodically?
      })
      .on("end", () => {
        console.log("[video-processor] Transcode complete:", outputPath);
        resolve();
      })
      .on("error", (err) => {
        console.error("[video-processor] Transcode error:", err);
        reject(err);
      })
      .run();
  });
}

/**
 * Background job to process uploaded video
 */
export async function processVideo(
  videoId: string,
  originalPath: string,
  finalVideoPath: string,
  thumbnailPath: string
) {
  try {
    console.log(`[video-processor] Starting processing for video ${videoId}`);

    // 1. Extract metadata
    let metadata: VideoMetadata;
    try {
      metadata = await extractVideoMetadata(originalPath);
    } catch (metaErr) {
      console.error(`[video-processor] Failed to extract metadata for ${videoId}:`, metaErr);
      // If we can't read it, it's probably invalid. Delete record?
      // For now, let's keep it but maybe set a flag? Or just delete.
      // Deleting is safer to avoid broken UI.
      await cleanupAndFail(videoId, originalPath);
      return;
    }

    // 2. Validate duration
    if (metadata.duration > MAX_VIDEO_DURATION) {
      console.warn(`[video-processor] Video ${videoId} is too long (${metadata.duration}s). Deleting.`);
      await cleanupAndFail(videoId, originalPath);
      return;
    }

    // 3. Transcode
    try {
      await transcodeToH264(originalPath, finalVideoPath);
      // Delete original
      await fs.unlink(originalPath).catch(() => {});
    } catch (transcodeErr) {
      console.warn(`[video-processor] Transcode failed for ${videoId}, using original file:`, transcodeErr);
      // Fallback: move original to final path
      await fs.rename(originalPath, finalVideoPath).catch(async () => {
        await fs.copyFile(originalPath, finalVideoPath);
        await fs.unlink(originalPath).catch(() => {});
      });
    }

    // 4. Generate Thumbnail
    try {
      await generateThumbnail(finalVideoPath, thumbnailPath);
    } catch (thumbErr) {
      console.error(`[video-processor] Thumbnail generation failed for ${videoId}:`, thumbErr);
      // We can still keep the video, just no thumbnail (or keep default placeholder)
    }

    // 5. Update Database
    await prisma.video.update({
      where: { id: videoId },
      data: {
        duration: metadata.duration,
        latitude: metadata.latitude ?? null,
        longitude: metadata.longitude ?? null,
        takenAt: metadata.takenAt ?? null,
        // We might want to update URLs if we used temp ones,
        // but currently we use deterministic filenames based on UUID
        // so URLs are likely already correct in DB.
      },
    });

    console.log(`[video-processor] Successfully processed video ${videoId}`);

  } catch (error) {
    console.error(`[video-processor] Unexpected error processing video ${videoId}:`, error);
    // Try to cleanup?
  }
}

async function cleanupAndFail(videoId: string, filePath: string) {
  try {
    await fs.unlink(filePath).catch(() => {});
    await prisma.video.delete({ where: { id: videoId } }).catch(() => {});
  } catch (e) {
    console.error(`[video-processor] Error during cleanup for ${videoId}:`, e);
  }
}
