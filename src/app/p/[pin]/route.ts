import { NextResponse, type NextRequest } from "next/server";
import { lookupInvitation, trackEvent } from "@/lib/api";
import { encodeSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

/*
 * Personalized QR deep link — what the QR code on a mailer points at:
 *   https://autocreditinvite.com/p/123456789   (dashes optional: /p/123-456-789)
 *
 * Valid code   → signed session set, lands on /invitation at "Is this you?"
 *                (never the code step).
 * Unknown / inactive / rate-limited / API down
 *              → /invitation code step, code pre-filled, matching error.
 * Every query param (utm_* and others) is carried over to /invitation either way.
 * Excluded from robots.txt and the sitemap.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/p/[pin]">) {
  const { pin: raw } = await ctx.params;
  const portal = new URL("/invitation", request.url);
  // Relative Location: stay on whatever host the visitor came in on, so the cookie goes with them.
  const go = () => new NextResponse(null, { status: 307, headers: { Location: `${portal.pathname}${portal.search}` } });
  // Keep marketing params (utm_*, etc.) so analytics still see the source.
  request.nextUrl.searchParams.forEach((v, k) => {
    if (k !== "code" && k !== "e") portal.searchParams.set(k, v);
  });

  const code = decodeURIComponent(raw).replace(/\D/g, "");
  if (code.length !== 9) return go();

  const found = await lookupInvitation(code);
  if (found.status === "inactive") trackEvent(code, "inactive", "qr");
  if (found.status !== "found") {
    portal.searchParams.set("code", code);
    const e = { not_found: "notfound", inactive: "inactive", rate_limited: "limit", unavailable: "unavailable" }[found.status];
    portal.searchParams.set("e", e);
    const res = go();
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  trackEvent(code, "opened", "qr");
  const res = go();
  res.cookies.set(
    SESSION_COOKIE,
    encodeSession({ b: found.invitation.code, c: found.invitation.campaignId, s: "identity", ch: "qr" }),
    sessionCookieOptions,
  );
  return res;
}
