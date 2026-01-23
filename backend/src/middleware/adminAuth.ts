import type { Context } from "hono";
import { getCookie } from "hono/cookie";

/**
 * Middleware to check if the request has a valid admin session
 * Returns error response if not authenticated, null if authenticated
 */
export const requireAdminAuth = (c: Context) => {
  const adminSession = getCookie(c, "admin_session");

  if (adminSession !== "authenticated") {
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

  return null;
};
