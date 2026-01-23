import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { env } from "../env";
import { z } from "zod";

const adminRouter = new Hono();

// Admin login request schema
const adminLoginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

// Session duration (7 days)
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * POST /api/admin/login
 * Simple password-based admin login
 */
adminRouter.post("/login", async (c) => {
  try {
    let body;
    try {
      // Try to get the request body
      const rawBody = await c.req.text();
      console.log("Raw body received:", rawBody);

      if (!rawBody) {
        return c.json(
          {
            error: {
              message: "No request body provided",
              code: "EMPTY_BODY",
            },
          },
          400
        );
      }

      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return c.json(
        {
          error: {
            message: "Invalid request body - must be valid JSON",
            code: "INVALID_JSON",
          },
        },
        400
      );
    }

    const { password } = adminLoginSchema.parse(body);

    // Check password against environment variable
    if (password !== env.ADMIN_PASSWORD) {
      return c.json(
        {
          error: {
            message: "Invalid password",
            code: "INVALID_CREDENTIALS",
          },
        },
        401
      );
    }

    // Set admin session cookie
    setCookie(c, "admin_session", "authenticated", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: SESSION_DURATION,
      path: "/",
      partitioned: true,
    });

    return c.json({
      data: {
        authenticated: true,
        message: "Successfully authenticated",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: {
            message: "Invalid request body",
            code: "VALIDATION_ERROR",
            details: error.issues,
          },
        },
        400
      );
    }

    console.error("Admin login error:", error);
    return c.json(
      {
        error: {
          message: "Internal server error",
          code: "INTERNAL_ERROR",
        },
      },
      500
    );
  }
});

/**
 * POST /api/admin/logout
 * Clear admin session
 */
adminRouter.post("/logout", (c) => {
  // Delete cookie with same attributes as when it was set
  deleteCookie(c, "admin_session", {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
    partitioned: true,
  });

  return c.json({
    data: {
      authenticated: false,
      message: "Successfully logged out",
    },
  });
});

/**
 * GET /api/admin/session
 * Check if admin is authenticated
 */
adminRouter.get("/session", (c) => {
  const adminSession = getCookie(c, "admin_session");

  return c.json({
    data: {
      authenticated: adminSession === "authenticated",
    },
  });
});

export { adminRouter };
