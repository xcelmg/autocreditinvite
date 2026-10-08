import "server-only";

/*
 * This site's own settings. Data and lead writes go through the shared
 * microsites API (MICROSITES_API_URL + MICROSITES_API_KEY, read in lib/api.ts)
 * — no database credentials live here.
 */

/** HMAC key for the session cookie. Required in production. */
export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("SESSION_SECRET must be set (32+ chars) in production.");
  }
  // Local development only.
  return "mac-dev-only-session-key-not-for-production-use";
}
