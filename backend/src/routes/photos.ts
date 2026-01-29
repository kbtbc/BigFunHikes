import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../prisma";
import { createPhotoSchema, uploadPhotoSchema, updatePhotoSchema } from "../types";
import type { Context } from "hono";
import { requireAdminAuth } from "../middleware/adminAuth";
import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import exifr from "exifr";

interface ExifData {
  latitude?: number;
  longitude?: number;
  takenAt?: Date;
}

/**
 * Convert DMS (degrees, minutes, seconds) array to decimal degrees
 */
function dmsToDecimal(dms: number[], ref: string): number | null {
  if (!Array.isArray(dms) || dms.length < 3) return null;

  const [degrees, minutes, seconds] = dms;
  if (typeof degrees !== 'number' || typeof minutes !== 'number' || typeof seconds !== 'number') {
    return null;
  }

  let decimal = degrees + minutes / 60 + seconds / 3600;

  // South and West are negative
  if (ref === 'S' || ref === 'W') {
    decimal = -decimal;
  }

  return decimal;
}

/**
 * Extract GPS coordinates and date taken from image EXIF data
 */
async function extractExifData(buffer: ArrayBuffer): Promise<ExifData> {
  try {
    // Debug: Check buffer validity
    const bytes = new Uint8Array(buffer);
    const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8;
    console.log("[photos] Buffer size:", buffer.byteLength, "bytes, isJPEG:", isJpeg);

    // First try to get GPS coordinates using exifr.gps() which is optimized for this
    const gps = await exifr.gps(buffer);

    // Then get date fields with a separate parse
    const dates = await exifr.parse(buffer, {
      pick: ["DateTimeOriginal", "CreateDate", "ModifyDate"],
    });

    const exifData: ExifData = {};

    // Extract GPS coordinates - check for valid numbers (not NaN)
    if (gps && typeof gps.latitude === "number" && typeof gps.longitude === "number"
        && !isNaN(gps.latitude) && !isNaN(gps.longitude)) {
      exifData.latitude = gps.latitude;
      exifData.longitude = gps.longitude;
      console.log("[photos] Extracted GPS via exifr.gps():", { lat: exifData.latitude, lon: exifData.longitude });
    } else {
      // Fallback: try to parse raw GPS tags manually
      console.log("[photos] exifr.gps() failed, trying manual parse. Raw result:", gps);

      try {
        const rawExif = await exifr.parse(buffer, {
          pick: ["GPSLatitude", "GPSLongitude", "GPSLatitudeRef", "GPSLongitudeRef"],
          translateValues: false, // Get raw values
        });

        console.log("[photos] Raw GPS tags:", rawExif);

        if (rawExif?.GPSLatitude && rawExif?.GPSLongitude) {
          const lat = dmsToDecimal(rawExif.GPSLatitude, rawExif.GPSLatitudeRef || 'N');
          const lon = dmsToDecimal(rawExif.GPSLongitude, rawExif.GPSLongitudeRef || 'W');

          if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
            exifData.latitude = lat;
            exifData.longitude = lon;
            console.log("[photos] Extracted GPS via manual DMS parse:", { lat, lon });
          }
        }
      } catch (fallbackError) {
        console.log("[photos] Manual GPS parse also failed:", fallbackError);
      }
    }

    // Extract date taken (try multiple EXIF date fields)
    if (dates) {
      const dateField = dates.DateTimeOriginal || dates.CreateDate || dates.ModifyDate;
      if (dateField) {
        exifData.takenAt = dateField instanceof Date ? dateField : new Date(dateField);
        console.log("[photos] Extracted date taken:", exifData.takenAt);
      }
    }

    return exifData;
  } catch (error) {
    console.error("[photos] Error extracting EXIF data:", error);
    return {};
  }
}

const photosRouter = new Hono();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "public", "uploads");
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Log startup info

/**
 * GET /api/debug/uploads
 * Debug endpoint to check uploads directory status
 */
photosRouter.get("/debug/uploads", async (c) => {
  try {
    const files = await fs.readdir(uploadsDir);
    const fileStats = await Promise.all(
      files.map(async (file) => {
        const stat = await fs.stat(path.join(uploadsDir, file));
        return {
          name: file,
          size: stat.size,
          modified: stat.mtime.toISOString(),
        };
      })
    );

    return c.json({
      data: {
        uploadsDir,
        backendUrl: process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || "http://localhost:3000",
        cwd: process.cwd(),
        fileCount: files.length,
        files: fileStats,
      },
    });
  } catch (error) {
    console.error("[photos] Debug error:", error);
    return c.json({
      data: {
        uploadsDir,
        backendUrl: process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || "http://localhost:3000",
        cwd: process.cwd(),
        error: String(error),
      },
    });
  }
});

/**
 * POST /api/entries/:id/photos
 * Add a photo to a journal entry
 */
photosRouter.post(
  "/:id/photos",
  zValidator("json", createPhotoSchema),
  async (c) => {
    const authError = requireAdminAuth(c);
    if (authError) return authError;

    const entryId = c.req.param("id");
    const data = c.req.valid("json");

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

      // Create the photo
      const photo = await prisma.photo.create({
        data: {
          ...data,
          journalEntryId: entryId,
        },
      });

      const formattedPhoto = {
        ...photo,
        createdAt: photo.createdAt.toISOString(),
      };

      return c.json({ data: formattedPhoto }, 201);
    } catch (error) {
      console.error("Error creating photo:", error);
      return c.json(
        {
          error: {
            message: "Failed to create photo",
            code: "CREATE_ERROR",
          },
        },
        500
      );
    }
  }
);

/**
 * POST /api/entries/:id/photos/upload
 * Upload a photo file to a journal entry
 */
photosRouter.post("/:id/photos/upload", async (c) => {
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

    // Validate file type (including HEIC/HEIF from iPhones and Pixels)
    const validImageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
    ];
    if (!validImageTypes.includes(file.type)) {
      console.log("[photos] Invalid file type:", file.type, "for file:", file.name);
      return c.json(
        {
          error: {
            message: `Invalid file type: ${file.type}. Only JPEG, PNG, WebP, GIF, and HEIC/HEIF images are allowed`,
            code: "INVALID_FILE_TYPE",
          },
        },
        400
      );
    }

    // Validate file size (max 10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxFileSize) {
      return c.json(
        {
          error: {
            message: "File size exceeds 10MB limit",
            code: "FILE_TOO_LARGE",
          },
        },
        400
      );
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop() || "jpg";
    const filename = `${randomUUID()}.${fileExt}`;
    const filepath = path.join(uploadsDir, filename);

    // Convert file to buffer and write to disk
    const buffer = await file.arrayBuffer();
    await fs.writeFile(filepath, new Uint8Array(buffer));

    // Extract EXIF data (GPS coordinates and date taken)
    const exifData = await extractExifData(buffer);

    // Construct relative URL for the photo (will be served by backend)
    // Using relative URL so it works with proxy
    const fileUrl = `/public/uploads/${filename}`;

    // Parse order as number
    let orderNum: number;
    try {
      orderNum = parseInt(order, 10);
      if (isNaN(orderNum) || orderNum < 0) {
        throw new Error();
      }
    } catch {
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

    // Create photo record in database with EXIF data
    const photo = await prisma.photo.create({
      data: {
        url: fileUrl,
        caption: caption || null,
        order: orderNum,
        journalEntryId: entryId,
        latitude: exifData.latitude ?? null,
        longitude: exifData.longitude ?? null,
        takenAt: exifData.takenAt ?? null,
      },
    });

    console.log("[photos] Created photo with EXIF data:", {
      id: photo.id,
      latitude: photo.latitude,
      longitude: photo.longitude,
      takenAt: photo.takenAt,
    });

    const formattedPhoto = {
      ...photo,
      createdAt: photo.createdAt.toISOString(),
      takenAt: photo.takenAt?.toISOString() ?? null,
    };

    return c.json({ data: formattedPhoto }, 201);
  } catch (error) {
    console.error("[photos] Error uploading photo:", error);
    return c.json(
      {
        error: {
          message: "Failed to upload photo",
          code: "UPLOAD_ERROR",
        },
      },
      500
    );
  }
});

/**
 * PATCH /api/entries/:id/photos/:photoId
 * Update a photo's caption
 */
photosRouter.patch(
  "/:id/photos/:photoId",
  zValidator("json", updatePhotoSchema),
  async (c) => {
    const authError = requireAdminAuth(c);
    if (authError) return authError;

    const entryId = c.req.param("id");
    const photoId = c.req.param("photoId");
    const data = c.req.valid("json");

    try {
      // Find the photo
      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
      });

      if (!photo) {
        return c.json(
          {
            error: {
              message: "Photo not found",
              code: "NOT_FOUND",
            },
          },
          404
        );
      }

      // Verify the photo belongs to this entry
      if (photo.journalEntryId !== entryId) {
        return c.json(
          {
            error: {
              message: "Photo does not belong to this journal entry",
              code: "INVALID_RELATIONSHIP",
            },
          },
          400
        );
      }

      // Update the photo
      const updatedPhoto = await prisma.photo.update({
        where: { id: photoId },
        data: {
          caption: data.caption,
        },
      });

      const formattedPhoto = {
        ...updatedPhoto,
        createdAt: updatedPhoto.createdAt.toISOString(),
      };

      return c.json({ data: formattedPhoto });
    } catch (error) {
      console.error("Error updating photo:", error);
      return c.json(
        {
          error: {
            message: "Failed to update photo",
            code: "UPDATE_ERROR",
          },
        },
        500
      );
    }
  }
);

/**
 * DELETE /api/entries/:id/photos/:photoId
 * Delete a photo from a journal entry
 */
photosRouter.delete("/:id/photos/:photoId", async (c) => {
  const authError = requireAdminAuth(c);
  if (authError) return authError;

  const entryId = c.req.param("id");
  const photoId = c.req.param("photoId");

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

    // Find the photo
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      return c.json(
        {
          error: {
            message: "Photo not found",
            code: "NOT_FOUND",
          },
        },
        404
      );
    }

    // Verify the photo belongs to this entry
    if (photo.journalEntryId !== entryId) {
      return c.json(
        {
          error: {
            message: "Photo does not belong to this journal entry",
            code: "INVALID_RELATIONSHIP",
          },
        },
        400
      );
    }

    // If the photo URL points to a local upload, delete the file
    const photoUrl = photo.url;
    if (photoUrl.includes("/public/uploads/")) {
      try {
        const filename = photoUrl.split("/public/uploads/")[1];
        if (filename) {
          const filepath = path.join(uploadsDir, filename);
          await fs.unlink(filepath).catch((err) => {
            // Log but don't fail if file doesn't exist
            console.warn(`[photos] Could not delete file ${filepath}:`, err);
          });
        }
      } catch (fileError) {
        console.warn("[photos] Error deleting photo file:", fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete the photo record from database
    await prisma.photo.delete({
      where: { id: photoId },
    });

    return c.body(null, 204);
  } catch (error) {
    console.error("Error deleting photo:", error);
    return c.json(
      {
        error: {
          message: "Failed to delete photo",
          code: "DELETE_ERROR",
        },
      },
      500
    );
  }
});

export { photosRouter };
