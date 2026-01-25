import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { env } from "../env";
import { z } from "zod";
import { authTokens, isValidToken } from "../tokenStore";

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

    // Determine if we're using HTTPS (for production) or HTTP (for local dev)
    const isSecure = c.req.url.startsWith("https://");
    
    // Extract hostname from request URL
    const url = new URL(c.req.url);
    const hostname = url.hostname;
    
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

    // Generate a token for Authorization header fallback (for cross-origin HTTP)
    // This allows authentication to work when cookies don't work across ports
    // Always generate token for domain names (even if HTTPS, as backup)
    let authToken: string | undefined;
    if (isDomainName) {
      authToken = Buffer.from(`admin_${Date.now()}_${Math.random()}`).toString("base64");
      // Store token with expiration
      authTokens.set(authToken, Date.now() + SESSION_DURATION * 1000);
      console.log(`[Login] Generated token for domain ${hostname}, cookie domain: ${cookieDomain}`);
    }

    console.log(`[Login] Successful login - isSecure: ${isSecure}, isDomainName: ${isDomainName}, token: ${!!authToken}`);

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
