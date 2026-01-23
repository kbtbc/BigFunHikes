// Conditionally import Vibecode proxy based on DISABLE_VIBECODE env var
if (process.env.DISABLE_VIBECODE !== "true") {
  await import("@vibecodeapp/proxy");
}

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import "./env";
import { sampleRouter } from "./routes/sample";
import { entriesRouter } from "./routes/entries";
import { photosRouter } from "./routes/photos";
import { statsRouter } from "./routes/stats";
import { adminRouter } from "./routes/admin";
import { logger } from "hono/logger";

const app = new Hono();

// CORS middleware - conditionally apply Vibecode-specific origins
const isVibecodeModeDisabled = process.env.DISABLE_VIBECODE === "true";

const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  ...(!isVibecodeModeDisabled
    ? [
        /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/,
        /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
      ]
    : []),
];

app.use(
  "*",
  cors({
    origin: (origin) => {
      // If Vibecode is disabled, allow all origins for local development
      if (isVibecodeModeDisabled) {
        return origin || "*";
      }
      // Otherwise, use the allowlist
      return origin && allowed.some((re) => re.test(origin)) ? origin : null;
    },
    credentials: true,
  })
);

// Logging
app.use("*", logger());

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// Debug endpoint for uploads
app.get("/api/debug/uploads", async (c) => {
  const fs = await import("fs/promises");
  const path = await import("path");
  const uploadsDir = path.join(process.cwd(), "public", "uploads");

  // Determine backend URL based on DISABLE_VIBECODE setting
  const getBackendUrl = () => {
    if (isVibecodeModeDisabled) {
      return `http://localhost:${process.env.PORT || 3000}`;
    }
    return process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
  };

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
        backendUrl: getBackendUrl(),
        cwd: process.cwd(),
        fileCount: files.length,
        files: fileStats,
      },
    });
  } catch (error) {
    return c.json({
      data: {
        uploadsDir,
        backendUrl: getBackendUrl(),
        cwd: process.cwd(),
        error: String(error),
      },
    });
  }
});

// Static file serving for uploads
app.use("/public/*", serveStatic({ root: "./" }));

// Routes
app.route("/api/sample", sampleRouter);
app.route("/api/admin", adminRouter);
app.route("/api/entries", entriesRouter);
app.route("/api/entries", photosRouter);
app.route("/api/stats", statsRouter);

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};
