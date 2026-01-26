import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { env } from "../env";
import { z } from "zod";
import { authTokens, isValidToken } from "../tokenStore";
import { randomBytes, timingSafeEqual } from "crypto";

const adminRouter = new Hono();

// Rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIP(c: { req: { header: (name: string) => string | undefined } }): string {
  return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
         c.req.header("x-real-ip") ||
         "unknown";
}

function isRateLimited(ip: string): { limited: boolean; retryAfter?: number } {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (!attempt || now > attempt.resetAt) {
    return { limited: false };
  }

  if (attempt.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((attempt.resetAt - now) / 1000);
    return { limited: true, retryAfter };
  }

  return { limited: false };
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const attempt = loginAttempts.get(ip);

  if (!attempt || now > attempt.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    attempt.count++;
  }
}

function clearAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

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
    // Rate limiting check
    const clientIP = getClientIP(c);
    const rateLimit = isRateLimited(clientIP);

    if (rateLimit.limited) {
      return c.json(
        {
          error: {
            message: `Too many login attempts. Try again in ${rateLimit.retryAfter} seconds.`,
            code: "RATE_LIMITED",
            retryAfter: rateLimit.retryAfter,
          },
        },
        429
      );
    }

    let body;
    try {
      // Try to get the request body
      const rawBody = await c.req.text();

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

    // Check password against environment variable using constant-time comparison
    const passwordBuffer = Buffer.from(password);
    const adminPasswordBuffer = Buffer.from(env.ADMIN_PASSWORD);
    const passwordsMatch = passwordBuffer.length === adminPasswordBuffer.length &&
      timingSafeEqual(passwordBuffer, adminPasswordBuffer);

    if (!passwordsMatch) {
      recordFailedAttempt(clientIP);
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

    // Clear rate limit on successful login
    clearAttempts(clientIP);

    // Determine if we're using HTTPS (for production) or HTTP (for local dev)
    const isSecure = c.req.url.startsWith("https://");

    // Extract hostname from request URL
    const url = new URL(c.req.url);
    const hostname = url.hostname;

    console.log(`[Login] Request URL: ${c.req.url}, hostname: ${hostname}, isSecure: ${isSecure}`);

    // Determine cookie domain: set for domain names, but not for localhost/IP addresses
    // This allows cookies to work across different ports on the same domain
    const isDomainName = hostname !== "localhost" &&
                        hostname !== "127.0.0.1" &&
                        !hostname.match(/^\d+\.\d+\.\d+\.\d+$/); // Not an IP address

    // For Vibecode subdomains, extract the parent domain to allow cross-subdomain cookies
    // e.g., preview-xxx.dev.vibecode.run -> .dev.vibecode.run
    let cookieDomain: string | undefined;
    if (isDomainName) {
      const parts = hostname.split('.');
      // If it's a vibecode subdomain (e.g., xxx.dev.vibecode.run or xxx.vibecode.run)
      if (hostname.includes('.vibecode.run')) {
        // Extract parent domain with leading dot (e.g., .dev.vibecode.run or .vibecode.run)
        cookieDomain = '.' + parts.slice(-3).join('.');
      } else {
        // For other domains, use the hostname as-is
        cookieDomain = hostname;
      }
    }

    // For domain names with HTTP, we need sameSite=None to work across ports
    // Even though browsers prefer secure=true with sameSite=None, some allow it for local dev
    // We'll try sameSite=None with secure=false for domain names on HTTP
    const sameSiteValue = isSecure ? "None" : (isDomainName ? "None" : "Lax");

    // Set admin session cookie
    setCookie(c, "admin_session", "authenticated", {
      httpOnly: true,
      secure: isSecure,
      sameSite: sameSiteValue as "None" | "Lax" | "Strict",
      maxAge: SESSION_DURATION,
      path: "/",
      ...(cookieDomain && { domain: cookieDomain }), // Set domain for cross-subdomain sharing
      ...(isSecure && { partitioned: true }), // Only use partitioned for HTTPS
    });

    // Always generate token for domain names OR when Vibecode mode is enabled (as backup)
    const isVibecodeModeEnabled = process.env.DISABLE_VIBECODE !== "true";
    let authToken: string | undefined;
    if (isDomainName || isVibecodeModeEnabled) {
      // Use cryptographically secure random bytes for token generation
      authToken = randomBytes(32).toString("base64url");
      // Store token with expiration
      authTokens.set(authToken, Date.now() + SESSION_DURATION * 1000);
      console.log(`[Login] Generated token for domain ${hostname}, cookie domain: ${cookieDomain}, vibecode: ${isVibecodeModeEnabled}`);
    }

    console.log(`[Login] Successful login - isSecure: ${isSecure}, isDomainName: ${isDomainName}, token: ${!!authToken}, vibecodeModeEnabled: ${isVibecodeModeEnabled}`);

    return c.json({
      data: {
        authenticated: true,
        message: "Successfully authenticated",
        // Include token for cross-origin requests when cookies don't work
        token: authToken,
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
  // Determine if we're using HTTPS (for production) or HTTP (for local dev)
  const isSecure = c.req.url.startsWith("https://");

  // Extract hostname from request URL
  const url = new URL(c.req.url);
  const hostname = url.hostname;

  // Determine cookie domain: set for domain names, but not for localhost/IP addresses
  const isDomainName = hostname !== "localhost" &&
                        hostname !== "127.0.0.1" &&
                        !hostname.match(/^\d+\.\d+\.\d+\.\d+$/); // Not an IP address

  // For Vibecode subdomains, extract the parent domain to allow cross-subdomain cookies
  let cookieDomain: string | undefined;
  if (isDomainName) {
    const parts = hostname.split('.');
    if (hostname.includes('.vibecode.run')) {
      cookieDomain = '.' + parts.slice(-3).join('.');
    } else {
      cookieDomain = hostname;
    }
  }

  // For domain names with HTTP, use sameSite=None to match login
  const sameSiteValue = isSecure ? "None" : (isDomainName ? "None" : "Lax");

  // Delete cookie with same attributes as when it was set
  deleteCookie(c, "admin_session", {
    httpOnly: true,
    secure: isSecure,
    sameSite: sameSiteValue as "None" | "Lax" | "Strict",
    path: "/",
    ...(cookieDomain && { domain: cookieDomain }), // Set domain for cross-subdomain sharing
    ...(isSecure && { partitioned: true }), // Only use partitioned for HTTPS
  });

  // Also invalidate token if present
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    authTokens.delete(token);
  }

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
 * Supports both cookie-based auth and token-based auth
 */
adminRouter.get("/session", (c) => {
  const adminSession = getCookie(c, "admin_session");
  
  // Check for Authorization header token (fallback for cross-origin HTTP)
  const authHeader = c.req.header("Authorization");
  let hasValidToken = false;
  
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    hasValidToken = isValidToken(token);
  }
  
  // Authenticated if either cookie or token is valid
  const authenticated = adminSession === "authenticated" || hasValidToken;

  return c.json({
    data: {
      authenticated,
    },
  });
});

export { adminRouter };
