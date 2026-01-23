import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "../prisma";
import { createPhotoSchema, uploadPhotoSchema } from "../types";
import type { Context } from "hono";
import { requireAdminAuth } from "../middleware/adminAuth";
import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";

const photosRouter = new Hono();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "public", "uploads");
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Log startup info
console.log("[photos] Upload directory:", uploadsDir);
console.log("[photos] BACKEND_URL:", process.env.BACKEND_URL);
console.log("[photos] VITE_BACKEND_URL:", process.env.VITE_BACKEND_URL);

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
  console.log("[photos] Upload request received");
  console.log("[photos] Entry ID:", c.req.param("id"));

  const authError = requireAdminAuth(c);
  if (authError) {
    console.log("[photos] Auth failed");
    return authError;
  }
  console.log("[photos] Auth passed");

  const entryId = c.req.param("id");

  try {
    // Verify that the journal entry exists
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      console.log("[photos] Entry not found:", entryId);
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
    console.log("[photos] Entry found:", entry.title);

    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get("file");
    const caption = formData.get("caption") as string | null;
    const order = formData.get("order") as string | null;

    console.log("[photos] Form data - file:", file ? "present" : "missing", "caption:", caption, "order:", order);

    // Validation
    if (!file || !(file instanceof File)) {
      console.log("[photos] No file provided");
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

    console.log("[photos] File info - name:", file.name, "type:", file.type, "size:", file.size);

    if (!order) {
      console.log("[photos] Missing order field");
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
    const validImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validImageTypes.includes(file.type)) {
      console.log("[photos] Invalid file type:", file.type);
      return c.json(
        {
          error: {
            message: "Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed",
            code: "INVALID_FILE_TYPE",
          },
        },
        400
      );
    }

    // Validate file size (max 10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxFileSize) {
      console.log("[photos] File too large:", file.size);
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

    console.log("[photos] Saving file to:", filepath);

    // Convert file to buffer and write to disk
    const buffer = await file.arrayBuffer();
    await fs.writeFile(filepath, new Uint8Array(buffer));

    // Verify file was written
    const fileStats = await fs.stat(filepath);
    console.log("[photos] File saved, size on disk:", fileStats.size);

    // Construct full URL for the photo using backend URL from environment
    const backendUrl = process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || "http://localhost:3000";
    const fileUrl = `${backendUrl}/public/uploads/${filename}`;

    console.log("[photos] File URL:", fileUrl);

    // Parse order as number
    let orderNum: number;
    try {
      orderNum = parseInt(order, 10);
      if (isNaN(orderNum) || orderNum < 0) {
        throw new Error();
      }
    } catch {
      console.log("[photos] Invalid order value:", order);
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

    // Create photo record in database
    const photo = await prisma.photo.create({
      data: {
        url: fileUrl,
        caption: caption || null,
        order: orderNum,
        journalEntryId: entryId,
      },
    });

    console.log("[photos] Photo record created:", photo.id);

    const formattedPhoto = {
      ...photo,
      createdAt: photo.createdAt.toISOString(),
    };

    console.log("[photos] Upload complete, returning:", formattedPhoto);
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
