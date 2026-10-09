import { NextResponse, type NextRequest } from "next/server";
import { trackVisit } from "@/lib/api";
import {
  isBot,
  isEntryPath,
  isVisitorId,
  QR_ARRIVAL_COOKIE,
  referrerOf,
  utcDay,
  VISIT_DAY_COOKIE,
  VISIT_DAY_MAX_AGE,
  VISITOR_COOKIE,
  visitorCookieOptions,
} from "@/lib/visitor";

/*
 * POST /api/visit  { path, referrer, utmMedium }  → 204 always
 *
 * The visit beacon (components/VisitBeacon.tsx) reports a page view here once
 * the page has been on screen for a moment. It counts as the visitor's `visit`
 * for the (UTC) day only when the browser kept the proxy's visitor cookie,
 * sent the request from this site, isn't a known bot, and was on a real entry
 * page (isEntryPath). Scanners and probes that fetch pages without keeping
 * cookies or running scripts never get here. The answer is the same whether or
 * not the visit counted.
 */

/** Largest body read: a path, a referrer URL and a utm_medium. */
const MAX_BODY = 4096;

type Beacon = { path: string; referrer: string | null; utmMedium: string | null };

const text = (v: unknown, max: number): string | null => (typeof v === "string" && v.length <= max ? v : null);

/** The beacon's body, or null when it is too large or not the JSON the beacon sends. */
async function readBeacon(request: NextRequest): Promise<Beacon | null> {
  if (!request.body || Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return null;
  const reader = request.body.getReader();
  const bytes = new Uint8Array(MAX_BODY);
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (size + value.byteLength > MAX_BODY) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    bytes.set(value, size);
    size += value.byteLength;
  }
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(bytes.subarray(0, size)));
  } catch {
    return null;
  }
  if (!json || typeof json !== "object") return null;
  const b = json as Record<string, unknown>;
  const path = text(b.path, 200);
  return path ? { path, referrer: text(b.referrer, 2048), utmMedium: text(b.utmMedium, 200) } : null;
}

export async function POST(request: NextRequest) {
  const res = new NextResponse(null, { status: 204 });
  try {
    const visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
    const fetchSite = request.headers.get("sec-fetch-site");
    if (!isVisitorId(visitorId) || isBot(request.headers.get("user-agent"))) return res;
    if (fetchSite !== null && fetchSite !== "same-origin") return res;
    const beacon = await readBeacon(request);
    if (!beacon || !isEntryPath(beacon.path)) return res;

    // A QR arrival is used once, by the first beacon after the deep link.
    const qr = beacon.path.startsWith("/p/") || request.cookies.has(QR_ARRIVAL_COOKIE);
    if (request.cookies.has(QR_ARRIVAL_COOKIE)) res.cookies.set(QR_ARRIVAL_COOKIE, "", visitorCookieOptions(0));

    const today = utcDay();
    if (request.cookies.get(VISIT_DAY_COOKIE)?.value === today) return res;
    const referrer = qr ? "direct" : referrerOf(beacon.referrer || null, request.nextUrl.hostname, beacon.utmMedium);
    trackVisit(visitorId, qr ? "qr" : "web", referrer);
    res.cookies.set(VISIT_DAY_COOKIE, today, visitorCookieOptions(VISIT_DAY_MAX_AGE));
    return res;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
