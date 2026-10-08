import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import {
  deviceOf,
  isBot,
  isVisitorId,
  newVisitorId,
  referrerOf,
  utcDay,
  VISIT_DAY_COOKIE,
  VISITOR_COOKIE,
  VISITOR_HEADER,
} from "@/lib/visitor";

/*
 * Runs on page requests for two jobs.
 *
 * 1. Personalized QR codes. UpDash prints each mailer's QR as
 *      https://updash.com/index.php/refer/c/<campaign key>/<code>
 *    which logs the scan and redirects to the campaign's "QR Code URL" with
 *      ?utm_source=<UpDash source>&utm_campaign=<job>&pin=<code>
 *    appended. Any page that arrives with a `pin` is sent to the /p/<code>
 *    deep link, which opens the portal at "Is this you?". Other query params
 *    (utm_*) ride along.
 *
 * 2. Visit counting for the conversion funnel. Each visitor gets an anonymous
 *    first-party id; their first page view of the (UTC) day is reported as a
 *    `visit` with the channel (qr for /p/ deep links, web otherwise), device
 *    and traffic source. Bots and prefetches are skipped. The report runs
 *    after the response (waitUntil), so it never slows the page.
 */

const YEAR = 60 * 60 * 24 * 365;

function reportVisit(request: NextRequest, event: NextFetchEvent, visitorId: string, channel: "qr" | "web") {
  const url = process.env.MICROSITES_API_URL?.replace(/\/+$/, "");
  const key = process.env.MICROSITES_API_KEY;
  if (!url || !key) return;
  const ua = request.headers.get("user-agent");
  const body = {
    event: "visit",
    channel,
    visitorId,
    device: deviceOf(ua),
    referrer:
      channel === "qr"
        ? "direct"
        : referrerOf(request.headers.get("referer"), request.nextUrl.hostname, request.nextUrl.searchParams.get("utm_medium")),
  };
  event.waitUntil(
    fetch(`${url}/v1/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Client-IP": (request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim(),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    }).catch(() => undefined),
  );
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { nextUrl } = request;

  // 1. UpDash QR redirect: ?pin=<code> on any page → /p/<code>.
  if (nextUrl.searchParams.has("pin") && !nextUrl.pathname.startsWith("/p/")) {
    const target = nextUrl.clone();
    const pin = (target.searchParams.get("pin") ?? "").replace(/\D/g, "");
    target.searchParams.delete("pin");
    if (pin.length === 9) target.pathname = `/p/${pin}`;
    return NextResponse.redirect(target);
  }

  // 2. Visit counting (GET page views by people, not prefetches or bots).
  const prefetch =
    request.headers.get("next-router-prefetch") ||
    /prefetch/i.test(request.headers.get("purpose") ?? "") ||
    /prefetch/i.test(request.headers.get("sec-purpose") ?? "");
  if (request.method !== "GET" || prefetch || isBot(request.headers.get("user-agent"))) return NextResponse.next();

  const existing = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = isVisitorId(existing) ? existing : newVisitorId();
  const today = utcDay();
  const counted = request.cookies.get(VISIT_DAY_COOKIE)?.value === today;

  // Hand a new id to this same request so the QR route can tag its `opened` event.
  const headers = new Headers(request.headers);
  headers.set(VISITOR_HEADER, visitorId);
  const res = NextResponse.next({ request: { headers } });

  const secure = process.env.NODE_ENV === "production";
  if (visitorId !== existing) {
    res.cookies.set(VISITOR_COOKIE, visitorId, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: YEAR });
  }
  if (!counted) {
    reportVisit(request, event, visitorId, nextUrl.pathname.startsWith("/p/") ? "qr" : "web");
    res.cookies.set(VISIT_DAY_COOKIE, today, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 26 });
  }
  return res;
}

export const config = {
  matcher: [
    // Pages only: skip Next internals, API routes and files with an extension (icons, images, robots.txt…).
    "/((?!_next/|api/|opengraph-image|twitter-image|icon|apple-icon|robots|sitemap|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
