/**
 * Activity Replay Studio - Backend API Routes
 *
 * This is a self-contained route file for the Replay Studio sub-project.
 * All endpoints are namespaced under /api/replay-studio/*
 *
 * Endpoints:
 *   POST /api/replay-studio/upload    - Upload a Suunto JSON file
 *   GET  /api/replay-studio/demo      - Get demo data
 *   GET  /api/replay-studio/:shareId  - Get uploaded activity by share ID
 */

import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { parseSuuntoJson } from "../lib/suunto-parser";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const replayStudioRoutes = new Hono();

// =============================================================================
// Upload Suunto JSON
// =============================================================================

replayStudioRoutes.post("/upload", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file;

    if (!file || !(file instanceof File)) {
      return c.json({ error: { message: "No file provided", code: "NO_FILE" } }, 400);
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".json")) {
      return c.json({ error: { message: "File must be a JSON file", code: "INVALID_TYPE" } }, 400);
    }

    // Read file content
    const fileContent = await file.text();

    // Validate it's valid JSON
    let rawJson: object;
    try {
      rawJson = JSON.parse(fileContent) as object;
    } catch {
      return c.json({ error: { message: "Invalid JSON file", code: "INVALID_JSON" } }, 400);
    }

    // Parse and validate as Suunto data
    let parsedData: ReturnType<typeof parseSuuntoJson>;
    try {
      parsedData = parseSuuntoJson(rawJson);
    } catch (e) {
      return c.json({
        error: {
          message: e instanceof Error ? e.message : "Failed to parse Suunto data",
          code: "PARSE_ERROR"
        }
      }, 400);
    }

    // Validate we have GPS track
    if (!parsedData.gpsTrack || parsedData.gpsTrack.length === 0) {
      return c.json({
        error: { message: "No GPS track data found in file", code: "NO_GPS" }
      }, 400);
    }

    // Store in database
    const upload = await prisma.replayStudioUpload.create({
      data: {
        filename: file.name,
        suuntoJson: fileContent,
        parsedData: JSON.stringify(parsedData),
      },
    });

    return c.json({
      data: {
        shareId: upload.shareId,
        viewUrl: `/suunto/view/${upload.shareId}`,
      },
    });
  } catch (e) {
    console.error("[Replay Studio] Upload error:", e);
    return c.json({
      error: { message: "Upload failed", code: "UPLOAD_ERROR" }
    }, 500);
  }
});

// =============================================================================
// Get Demo Data
// =============================================================================

replayStudioRoutes.get("/demo", async (c) => {
  try {
    // Load demo data from the sample file
    const demoFilePath = path.join(process.cwd(), "data", "suwaneetrek-1.json");

    if (!fs.existsSync(demoFilePath)) {
      return c.json({
        error: { message: "Demo data not available", code: "NO_DEMO" }
      }, 404);
    }

    const fileContent = fs.readFileSync(demoFilePath, "utf-8");
    const parsedData = parseSuuntoJson(JSON.parse(fileContent));

    return c.json({
      data: {
        filename: "demo-training-hike.json",
        parsedData,
        isDemo: true,
      },
    });
  } catch (e) {
    console.error("[Replay Studio] Demo error:", e);
    return c.json({
      error: { message: "Failed to load demo data", code: "DEMO_ERROR" }
    }, 500);
  }
});

// =============================================================================
// Get Upload by Share ID
// =============================================================================

replayStudioRoutes.get("/:shareId", async (c) => {
  try {
    const shareId = c.req.param("shareId");

    const upload = await prisma.replayStudioUpload.findUnique({
      where: { shareId },
    });

    if (!upload) {
      return c.json({
        error: { message: "Activity not found", code: "NOT_FOUND" }
      }, 404);
    }

    // Check if expired
    if (upload.expiresAt && upload.expiresAt < new Date()) {
      return c.json({
        error: { message: "This activity has expired", code: "EXPIRED" }
      }, 410);
    }

    // Increment view count
    await prisma.replayStudioUpload.update({
      where: { shareId },
      data: { viewCount: { increment: 1 } },
    });

    return c.json({
      data: {
        shareId: upload.shareId,
        filename: upload.filename,
        parsedData: JSON.parse(upload.parsedData),
        createdAt: upload.createdAt.toISOString(),
        viewCount: upload.viewCount + 1,
      },
    });
  } catch (e) {
    console.error("[Replay Studio] Get error:", e);
    return c.json({
      error: { message: "Failed to retrieve activity", code: "GET_ERROR" }
    }, 500);
  }
});

export { replayStudioRoutes };
