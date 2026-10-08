/*
 * Anonymous visitor context for the conversion funnel. Shared by the proxy
 * (which issues the cookies and records visits) and by server code (which
 * attaches the visitor and device to later funnel events). No personal data:
 * the id is random and lives only in a first-party cookie.
 */

/** Random visitor id, kept a year so a visitor counts once across days. */
export const VISITOR_COOKIE = "mv_id";
/** UTC date of the visitor's last recorded visit, so a visit counts once a day. */
export const VISIT_DAY_COOKIE = "mv_day";
/** Request header the proxy uses to hand a brand-new visitor id to the same request. */
export const VISITOR_HEADER = "x-mv-id";

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
