/*
 * Anonymous visitor context for the conversion funnel. Shared by the proxy
 * (which issues the visitor cookie), the visit beacon (components/VisitBeacon.tsx
 * and app/api/visit, which record visits) and server code (which attaches the
 * visitor and device to later funnel events). No personal data: the id is
 * random and lives only in a first-party cookie.
 */

/** Random visitor id, kept a year so a visitor counts once across days. */
export const VISITOR_COOKIE = "mv_id";
/** UTC date of the visitor's last recorded visit, so a visit counts once a day. */
export const VISIT_DAY_COOKIE = "mv_day";
/** Request header the proxy uses to hand a brand-new visitor id to the same request. */
export const VISITOR_HEADER = "x-mv-id";
/** Set by the proxy on a QR deep link, so the visit on the page it redirects to counts as `qr`. */
export const QR_ARRIVAL_COOKIE = "mv_qr";
/** Cookie lifetimes in seconds: the id a year, the visit day a little over a day, a QR arrival ten minutes. */
export const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;
export const VISIT_DAY_MAX_AGE = 60 * 60 * 26;
export const QR_ARRIVAL_MAX_AGE = 60 * 10;

/** Attributes of the visitor cookies: first-party and out of reach of page scripts. */
export function visitorCookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge } as const;
}

export type Device = "mobile" | "tablet" | "desktop";
export type Referrer = "direct" | "search" | "social" | "email" | "other";

const BOT_RE =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|quora link|whatsapp|vercel|lighthouse|headless|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch/i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT_RE.test(userAgent);
}

export function deviceOf(userAgent: string | null): Device {
  const ua = userAgent ?? "";
  if (/iPad|Tablet|Silk|Kindle|(Android(?!.*Mobile))/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|BlackBerry|Opera Mini|IEMobile/i.test(ua)) return "mobile";
  return "desktop";
}

/** Traffic source of a visit from its Referer and utm_medium. Same-site referrers count as direct. */
export function referrerOf(referer: string | null, ownHost: string, utmMedium: string | null): Referrer {
  if (utmMedium && /e-?mail/i.test(utmMedium)) return "email";
  if (!referer) return "direct";
  let host = "";
  try {
    host = new URL(referer).hostname.replace(/^www\./, "");
  } catch {
    return "other";
  }
  if (!host || host === ownHost.replace(/^www\./, "")) return "direct";
  if (/(^|\.)(google|bing|yahoo|duckduckgo|ecosia|baidu|yandex|search\.brave)\./.test(host)) return "search";
  if (/(^|\.)(facebook|fb|instagram|t|twitter|x|tiktok|linkedin|pinterest|reddit|youtube|snapchat|nextdoor)\.(com|co)$/.test(host))
    return "social";
  if (/mail|outlook|yahoo\.net/.test(host)) return "email";
  return "other";
}

export function newVisitorId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const isVisitorId = (v: string | null | undefined): v is string => !!v && /^[A-Za-z0-9_-]{16,32}$/.test(v);

export function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Pages a visit counts on: the landing pages and QR deep links, never a 404 or a probed path. */
export function isEntryPath(path: string): boolean {
  return path === "/" || path === "/invitation" || /^\/p\/\d{9}$/.test(path);
}
