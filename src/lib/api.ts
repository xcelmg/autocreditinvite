import "server-only";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { deviceOf, isVisitorId, VISITOR_COOKIE, VISITOR_HEADER, type Device, type Referrer } from "./visitor";
import type { Details } from "./details";

/*
 * The only way this site touches UpDash: the shared microsites API
 * (microsites-api). This site holds a site key — no database account.
 * The API fixes this site's lead Source (AutoCreditInvite.com) by that key.
 * This site doesn't use the API's text verification.
 */

export type Dealer = {
  campaignId: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  phoneHref: string | null;
};
export type Offer = { low: number | null; high: number | null; expires: string | null };
/** `creditApp`: the API takes this site's credit application once the response is a lead. */
export type Campaign = { dealer: Dealer; offer: Offer; creditApp?: boolean };
export type VerifyMode = "twilio" | "demo" | "off";
export type MailedVehicle = { year: number | null; make: string | null; model: string | null };

export type Invitation = {
  code: string;
  campaignId: number;
  firstName: string | null;
  lastName: string | null;
  maskedAddress: string | null;
  needsName: boolean;
  vehicle: MailedVehicle | null;
  alreadyResponded: boolean;
};

export type Lookup =
  | { status: "found"; mode: "live" | "demo"; verify: VerifyMode; invitation: Invitation; campaign: Campaign }
  | { status: "not_found" | "inactive" | "rate_limited" | "unavailable" };

function config(): { url: string; key: string } | null {
  const url = process.env.MICROSITES_API_URL?.replace(/\/+$/, "");
  const key = process.env.MICROSITES_API_KEY;
  return url && key ? { url, key } : null;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim();
}

type Result = { status: number; json: Record<string, unknown> };

async function call(path: string, payload: unknown): Promise<Result> {
  const cfg = config();
  if (!cfg) {
    console.error("[api] MICROSITES_API_URL / MICROSITES_API_KEY not set");
    return { status: 503, json: {} };
  }
  try {
    const res = await fetch(`${cfg.url}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
        "X-Client-IP": await clientIp(),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.status >= 500 || res.status === 401) console.error(`[api] ${path} → ${res.status}`, json.error ?? "");
    return { status: res.status, json };
  } catch (e) {
    console.error(`[api] ${path} failed:`, e instanceof Error ? e.message : e);
    return { status: 503, json: {} };
  }
}

export async function lookupInvitation(code: string): Promise<Lookup> {
  const r = await call("/v1/invitations/lookup", { code });
  if (r.status === 200) {
    const invitation = r.json.invitation as Invitation;
    return {
      status: "found",
      mode: r.json.mode as "live" | "demo",
      verify: r.json.verify as VerifyMode,
      invitation: { ...invitation, vehicle: invitation.vehicle ?? null },
      campaign: { ...(r.json.campaign as Campaign), creditApp: r.json.creditApp === true },
    };
  }
  if (r.status === 404 || r.status === 400) return { status: "not_found" };
  // The code is real, but its campaign is upcoming or over.
  if (r.status === 410) return { status: "inactive" };
  if (r.status === 429) return { status: "rate_limited" };
  return { status: "unavailable" };
}

/** Funnel steps reported to the API for conversion tracking (submitted is recorded by the API). */
export type FunnelEvent = "opened" | "found" | "not_found" | "inactive" | "confirmed" | "not_me";
/** How the visitor arrived: a QR / deep link, or a code typed on the site. */
export type Channel = "qr" | "web";

/**
 * Report a funnel step. Runs after the response is sent, so it never slows the
 * visitor, and a failure only leaves a gap in the funnel. Call it from Server
 * Actions or Route Handlers.
 */
export function trackEvent(code: string, event: FunnelEvent, channel: Channel | undefined): void {
  after(async () => {
    await call("/v1/events", { code, event, channel, ...(await visitorContext()) });
  });
}

/** Report a visitor's `visit` for the day (app/api/visit decides when one counts). Runs after the response is sent. */
export function trackVisit(visitorId: string, channel: Channel, referrer: Referrer): void {
  after(async () => {
    await call("/v1/events", { event: "visit", channel, visitorId, device: deviceOf((await headers()).get("user-agent")), referrer });
  });
}

/** The anonymous visitor id (cookie, or the header the proxy sets on a first visit) and device class. */
async function visitorContext(): Promise<{ visitorId?: string; device: Device }> {
  const h = await headers();
  const fromCookie = (await cookies()).get(VISITOR_COOKIE)?.value;
  const id = isVisitorId(fromCookie) ? fromCookie : h.get(VISITOR_HEADER);
  return { visitorId: isVisitorId(id) ? id : undefined, device: deviceOf(h.get("user-agent")) };
}

export type SubmitInput = {
  code: string;
  channel?: Channel;
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  notes?: string[];
  timeoffset?: number;
  /** Optional answers; only whitelisted keys/values (see lib/details.ts). */
  details?: Details;
};

export type SubmitResult = { ok: true; confirmation: string } | { ok: false };

export async function submitResponse(input: SubmitInput): Promise<SubmitResult> {
  const body = { ...input, details: input.details && Object.keys(input.details).length ? input.details : undefined };
  const r = await call("/v1/responses", { ...body, ...(await visitorContext()) });
  if ((r.status === 201 || r.status === 200) && r.json.ok === true) {
    return { ok: true, confirmation: String(r.json.confirmation) };
  }
  return { ok: false };
}

export type ApiHealth = { reachable: boolean; mode: "live" | "demo" | "unknown" };

/** API mode for the demo banner; cached briefly so pages don't each wait on it. */
export async function apiHealth(): Promise<ApiHealth> {
  const cfg = config();
  if (!cfg) return { reachable: false, mode: "unknown" };
  try {
    const res = await fetch(`${cfg.url}/v1/health`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) });
    const json = (await res.json()) as { mode?: string };
    return { reachable: res.ok, mode: json.mode === "live" ? "live" : json.mode === "demo" ? "demo" : "unknown" };
  } catch {
    return { reachable: false, mode: "unknown" };
  }
}

// ── Appointments (after the response is submitted) ──────────────────────────

export type SlotDay = { date: string; label: string; open: string; close: string; times: string[] };
export type Slots = { timeZone: string; days: SlotDay[] };

/**
 * Bookable days and times at the dealership. `waiting` until UpDash's cron has
 * turned the response into a lead (about a minute after submit); `off` when the
 * dealership doesn't take bookings here (the specialist texts instead).
 */
export type SlotsResult = { status: "ready"; slots: Slots | null } | { status: "waiting" } | { status: "off" };

export async function getAppointmentSlots(code: string): Promise<SlotsResult> {
  const r = await call("/v1/appointments/slots", { code });
  if (r.status !== 200) return { status: "off" };
  if (r.json.ready !== true) return { status: "waiting" };
  const days = (Array.isArray(r.json.days) ? r.json.days : [])
    .map((d: Record<string, unknown>) => ({
      date: String(d.date ?? ""),
      label: String(d.label ?? ""),
      open: String(d.open ?? ""),
      close: String(d.close ?? ""),
      times: Array.isArray(d.times) ? d.times.map(String).filter(Boolean) : [],
    }))
    .filter((d: SlotDay) => /^\d{4}-\d{2}-\d{2}$/.test(d.date) && d.times.length > 0);
  const timeZone = typeof r.json.timeZone === "string" ? r.json.timeZone : "";
  return { status: "ready", slots: days.length ? { timeZone, days } : null };
}

export type BookResult =
  | { status: "booked"; when: string }
  | { status: "slot_unavailable" | "lead_not_ready" | "off" | "invalid" };

export async function bookAppointment(code: string, date: string, time: string, channel: Channel | undefined): Promise<BookResult> {
  const r = await call("/v1/appointments", { code, date, time, channel, ...(await visitorContext()) });
  if ((r.status === 201 || r.status === 200) && r.json.ok === true) {
    return { status: "booked", when: String(r.json.when ?? "") };
  }
  const err = (r.json.error as { code?: string } | undefined)?.code;
  if (r.status === 409 && err === "slot_unavailable") return { status: "slot_unavailable" };
  if (r.status === 409 && err === "lead_not_ready") return { status: "lead_not_ready" };
  if (r.status === 400) return { status: "invalid" };
  // 409 appointments_off, 410 inactive, 404, 429, 503: hide booking; the specialist will text.
  return { status: "off" };
}

export type CreditResult = "ok" | "lead_not_ready" | "invalid_ssn" | "invalid_dob" | "consent_required" | "off" | "error";

/**
 * Send the credit application. The values go straight to the API and
 * are never logged or kept here; only the outcome comes back.
 */
export async function sendCreditApplication(
  code: string,
  ssn: string,
  dob: string,
  consentVersion: string,
  channel: Channel | undefined,
): Promise<CreditResult> {
  const r = await call("/v1/credit-applications", { code, ssn, dob, consent: true, consentVersion, channel, ...(await visitorContext()) });
  if (r.status === 201 || r.status === 200) return "ok";
  const err = (r.json.error as { code?: string } | undefined)?.code;
  if (r.status === 409 && err === "lead_not_ready") return "lead_not_ready";
  if (r.status === 400 && (err === "invalid_ssn" || err === "invalid_dob" || err === "consent_required")) return err;
  if (r.status === 409 && err === "credit_app_off") return "off";
  return "error";
}
