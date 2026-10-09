import { NextResponse, type NextRequest } from "next/server";
import {
  isBot,
  isVisitorId,
  newVisitorId,
  QR_ARRIVAL_COOKIE,
  QR_ARRIVAL_MAX_AGE,
  visitorCookieOptions,
  VISITOR_COOKIE,
  VISITOR_HEADER,
  VISITOR_MAX_AGE,
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
 * 2. The anonymous visitor id for the conversion funnel: a first-party
 *    cookie (mv_id), handed to this same request in a header when it is new so
 *    the QR route can tag its `opened` event. A QR deep link also gets a
 *    short-lived marker (mv_qr), so the visit counts as `qr`. Visits are
 *    reported by the page itself (components/VisitBeacon.tsx → /api/visit), so
 *    scanners that fetch pages without cookies or scripts never count.
 */

export function proxy(request: NextRequest) {
  const { nextUrl } = request;

  // 1. UpDash QR redirect: ?pin=<code> on any page → /p/<code>.
  if (nextUrl.searchParams.has("pin") && !nextUrl.pathname.startsWith("/p/")) {
    const target = nextUrl.clone();
    const pin = (target.searchParams.get("pin") ?? "").replace(/\D/g, "");
    target.searchParams.delete("pin");
    if (pin.length === 9) target.pathname = `/p/${pin}`;
    return NextResponse.redirect(target);
  }

  // 2. Visitor id (GET page views by people, not prefetches or bots).
  const prefetch =
    request.headers.get("next-router-prefetch") ||
    /prefetch/i.test(request.headers.get("purpose") ?? "") ||
    /prefetch/i.test(request.headers.get("sec-purpose") ?? "");
  if (request.method !== "GET" || prefetch || isBot(request.headers.get("user-agent"))) return NextResponse.next();

  const existing = request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = isVisitorId(existing) ? existing : newVisitorId();

  // Hand a new id to this same request so the QR route can tag its `opened` event.
  const headers = new Headers(request.headers);
  headers.set(VISITOR_HEADER, visitorId);
  const res = NextResponse.next({ request: { headers } });

  if (visitorId !== existing) res.cookies.set(VISITOR_COOKIE, visitorId, visitorCookieOptions(VISITOR_MAX_AGE));
  // The QR route redirects to the portal; the marker tells the visit beacon there how this visitor arrived.
  if (nextUrl.pathname.startsWith("/p/")) res.cookies.set(QR_ARRIVAL_COOKIE, "1", visitorCookieOptions(QR_ARRIVAL_MAX_AGE));
  return res;
}

export const config = {
  matcher: [
    // Pages only: skip Next internals, API routes and files with an extension (icons, images, robots.txt…).
    "/((?!_next/|api/|opengraph-image|twitter-image|icon|apple-icon|robots|sitemap|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
