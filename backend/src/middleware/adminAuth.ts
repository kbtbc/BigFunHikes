import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { isValidToken } from "../tokenStore";

/**
 * Middleware to check if the request has a valid admin session
 * Returns error response if not authenticated, null if authenticated
 * 
 * Supports both cookie-based auth and Authorization header token (for cross-origin HTTP)
 */
export const requireAdminAuth = (c: Context) => {
  const adminSession = getCookie(c, "admin_session");

  // Check for Authorization header token (fallback for cross-origin HTTP)
  const authHeader = c.req.header("Authorization");
  let hasValidToken = false;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    hasValidToken = isValidToken(token);
    console.log(`[Auth] Token check - has token: ${!!token}, valid: ${hasValidToken}`);
  }

  console.log(`[Auth] Cookie session: ${adminSession}, Token valid: ${hasValidToken}`);

  // Accept either cookie-based auth or token-based auth
  if (adminSession !== "authenticated" && !hasValidToken) {
    console.log(`[Auth] UNAUTHORIZED - cookie: ${adminSession}, token: ${hasValidToken}`);
    return c.json(
      {
        error: {
          message: "Unauthorized - Admin access required",
          code: "UNAUTHORIZED",
        },
      },
      401
    );
  }

  console.log(`[Auth] AUTHORIZED via ${adminSession === "authenticated" ? "cookie" : "token"}`);
  return null;
};
