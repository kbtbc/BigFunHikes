// In-memory token store for cross-origin HTTP authentication
// Maps token -> expiration timestamp
export const authTokens = new Map<string, number>();

// Clean up expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, expires] of authTokens.entries()) {
    if (expires < now) {
      authTokens.delete(token);
    }
  }
}, 60 * 1000); // Clean up every minute

// Check if a token is valid
export function isValidToken(token: string): boolean {
  const expires = authTokens.get(token);
  if (!expires) return false;
  if (expires < Date.now()) {
    authTokens.delete(token);
    return false;
  }
  return true;
}
