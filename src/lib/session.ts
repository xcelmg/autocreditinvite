import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { sessionSecret } from "./env";
import { cleanDetails, type Details } from "./details";

/*
 * The visitor's place in the invitation flow: which code, which campaign,
 * which step, their optional answers and the contact details given.
 * HMAC-signed so none of it can be edited in the browser (httpOnly, so
 * scripts can't read it either).
 */

export const SESSION_COOKIE = "mac_s";
const TTL_SECONDS = 60 * 60 * 2; // long enough to finish, short enough to expire on a shared device

export type Stage = "identity" | "answers" | "contact" | "done";
const STAGES: Stage[] = ["identity", "answers", "contact", "done"];

export type Session = {
  /** 9-digit Invitation Code (UpDash barcode). */
  b: string;
  /** updash_campaign.Id */
  c: number;
  /** Current step. */
  s: Stage;
  /** Optional "A few questions" answers (exact API enum strings). */
  d?: Details;
  /** Names typed by the visitor (when the invitation has no usable name). */
  fn?: string;
  /** Mobile (10 digits) from the contact step. */
  p?: string;
  /** Confirmation number shown on the result. */
  k?: string;
  /** How the visitor arrived: "qr" (QR / deep link) or "web" (typed the code). */
  ch?: "qr" | "web";
  /**
   * Appointment booked on the result step: date (YYYY-MM-DD), time ("4:30 PM"),
   * the API's wording ("Saturday, October 4 at 4:30 PM") and the store's time zone.
   */
  ap?: { d: string; t: string; w: string; z: string };
  /** 1 once the credit application was sent (never the values). */
  ca?: 1;
  /** Issued-at, epoch seconds. */
  t: number;
};

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function encodeSession(s: Omit<Session, "t">): string {
  const payload = Buffer.from(JSON.stringify({ ...s, t: Math.floor(Date.now() / 1000) })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(raw: string | undefined): Session | null {
  if (!raw) return null;
  const [payload, mac] = raw.split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (typeof s.b !== "string" || !Number.isInteger(s.c) || typeof s.t !== "number") return null;
    if (!STAGES.includes(s.s)) return null;
    if (Date.now() / 1000 - s.t > TTL_SECONDS) return null;
    if (s.d) s.d = cleanDetails(s.d as Record<string, unknown>);
    return s;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: TTL_SECONDS,
};

/** Read the session in a Server Component, Server Action or Route Handler. */
export async function readSession(): Promise<Session | null> {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Set the session (Server Action or Route Handler only). */
export async function writeSession(s: Omit<Session, "t">): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, encodeSession(s), sessionCookieOptions);
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
