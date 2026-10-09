"use server";

import {
  bookAppointment,
  sendCreditApplication,
  getAppointmentSlots,
  lookupInvitation,
  submitResponse,
  trackEvent,
  type Lookup,
  type SlotsResult,
} from "@/lib/api";
import { cleanDetails, DETAIL_KEYS } from "@/lib/details";
import { answersView, contactView, doneView, identityView, viewFromSession, unavailable, type FlowView } from "@/lib/flow";
import { clearSession, readSession, writeSession, type Session } from "@/lib/session";

/*
 * The invitation portal's single server action. Each form posts an `intent`;
 * the action advances the signed session and returns the next screen. All
 * data and lead writes go through the microsites API.
 *
 *   code     → look up the Invitation Code                 → identity
 *   confirm  → "Yes, that's me"                             → answers
 *   notme    → "That's not me"                              → code
 *   answers  → optional "A few questions" answers (or skip) → contact
 *   back     → from contact, change the answers             → answers
 *   contact  → mobile + consent; queue the lead in UpDash   → done (credit application first)
 *   book     → on the result, book (or move) a visit          → done
 *   restart  → start over                                   → code
 *
 * The credit application itself posts through sendCredit (below) once the
 * response is in, retrying while UpDash turns the response into a lead.
 *
 * Funnel events (lib/api trackEvent, sent after the response): found / not_found /
 * inactive on a typed lookup (channel "web"), confirmed on "Yes", not_me on "That's not
 * me"; /p/[pin] reports opened / inactive (channel "qr"). The API records
 * submitted from the response, which carries the session's channel.
 */

const NAME_RE = /^[\p{L}][\p{L}' .-]{0,39}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const CODE_ERRORS = {
  notFound: "We couldn't find that Invitation Code. Check the 9 digits on your mailer and try again.",
  inactive:
    "This Invitation Code isn't active right now — invitations are good only for the dates on your mailer. The dealership named on your mailer can still help.",
  invalid: "Your Invitation Code is the 9-digit number printed on your mailer.",
  limit: "Too many tries in a row. Please wait a few minutes and try again.",
  unavailable: "We can't look up Invitation Codes right this second. Please try again in a moment.",
  notMe: "Thanks for letting us know. Please double-check the Invitation Code on your mailer and try again.",
  timeout: "Your session timed out for your privacy. Please enter your Invitation Code again.",
};

type Found = Extract<Lookup, { status: "found" }>;

/** Re-read the invitation for this session, or the code-step error to show (a retry when the API didn't answer). */
async function current(session: Session): Promise<Found | FlowView> {
  const found = await lookupInvitation(session.b);
  if (found.status === "found") return found;
  if (found.status === "unavailable") return unavailable();
  const error = found.status === "inactive" ? CODE_ERRORS.inactive : CODE_ERRORS.timeout;
  if (found.status === "inactive") await clearSession();
  return { step: "code", error };
}

export async function flowAction(_prev: FlowView, fd: FormData): Promise<FlowView> {
  const intent = String(fd.get("intent") ?? "");

  if (intent === "notme") {
    const s = await readSession();
    if (s?.s === "identity") trackEvent(s.b, "not_me", s.ch);
  }
  if (intent === "restart" || intent === "notme") {
    await clearSession();
    return { step: "code", notice: intent === "notme" ? CODE_ERRORS.notMe : undefined };
  }
  if (intent === "code") return lookupCode(String(fd.get("code") ?? ""));

  const session = await readSession();
  if (!session) return { step: "code", error: CODE_ERRORS.timeout };

  if (intent === "confirm" && session.s === "identity") {
    const found = await current(session);
    if ("step" in found) return found;
    trackEvent(session.b, "confirmed", session.ch);
    await writeSession({ ...session, s: "answers" });
    return answersView(found.invitation, found.campaign, session.d);
  }

  if (intent === "answers" && session.s === "answers") {
    const found = await current(session);
    if ("step" in found) return found;
    const raw: Record<string, unknown> = {};
    if (fd.get("skip") !== "all") for (const k of DETAIL_KEYS) raw[k] = fd.get(k);
    await writeSession({ ...session, s: "contact", d: cleanDetails(raw) });
    return contactView(found.invitation, found.campaign);
  }

  if (intent === "back" && session.s === "contact") {
    const found = await current(session);
    if ("step" in found) return found;
    await writeSession({ ...session, s: "answers" });
    return answersView(found.invitation, found.campaign, session.d);
  }

  if (intent === "contact" && session.s === "contact") return submitContact(session, fd);

  if (intent === "book" && session.s === "done") return book(session, fd);

  // Anything out of order: show wherever the session actually is.
  return viewFromSession(session);
}

async function lookupCode(raw: string): Promise<FlowView> {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 9) return { step: "code", code: raw, error: CODE_ERRORS.invalid };
  const found = await lookupInvitation(digits);
  if (found.status === "found" || found.status === "inactive" || found.status === "not_found") {
    trackEvent(digits, found.status, "web");
  }
  if (found.status !== "found") {
    const error = {
      not_found: CODE_ERRORS.notFound,
      inactive: CODE_ERRORS.inactive,
      rate_limited: CODE_ERRORS.limit,
      unavailable: CODE_ERRORS.unavailable,
    }[found.status];
    return { step: "code", code: raw, error };
  }
  const { invitation, campaign } = found;
  await writeSession({ b: invitation.code, c: invitation.campaignId, s: "identity", ch: "web" });
  return identityView(invitation, campaign);
}

/** Home-page hero form: same lookup; on success the client opens the portal (after its verification sequence). */
export type HeroResult = { error?: string; ok?: true; dealer?: string };
export async function heroCodeAction(_prev: HeroResult, fd: FormData): Promise<HeroResult> {
  const view = await lookupCode(String(fd.get("code") ?? ""));
  if (view.step === "code") return { error: view.error };
  return { ok: true, dealer: view.step === "identity" ? view.dealer.name : undefined };
}

/** Contact details in: queue the lead in UpDash and show the result. */
async function submitContact(session: Session, fd: FormData): Promise<FlowView> {
  const found = await current(session);
  if ("step" in found) return found;
  const { invitation, campaign } = found;
  const needName = invitation.needsName;

  const phone = String(fd.get("phone") ?? "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const firstName = String(fd.get("firstName") ?? "").trim();
  const lastName = String(fd.get("lastName") ?? "").trim();
  const tz = Math.max(-840, Math.min(840, Math.round(Number(fd.get("tz")) || 0)));
  const errors: Record<string, string> = {};
  if (needName && !NAME_RE.test(firstName)) errors.firstName = "Please enter your first name.";
  if (needName && !NAME_RE.test(lastName)) errors.lastName = "Please enter your last name.";
  if (phone.length !== 10 || /^[01]/.test(phone)) errors.phone = "Please enter a 10-digit U.S. mobile number.";
  if (email && (!EMAIL_RE.test(email) || email.length > 120)) errors.email = "That email doesn't look quite right.";
  if (fd.get("consent") !== "yes") errors.consent = "Please check the box so your specialist can text you.";
  if (Object.keys(errors).length) return contactView(invitation, campaign, { fieldErrors: errors });

  const result = await submitResponse({
    code: session.b,
    channel: session.ch,
    phone,
    email: email || undefined,
    firstName: needName ? firstName : undefined,
    lastName: needName ? lastName : undefined,
    timeoffset: tz,
    details: session.d,
  });
  // No answer from the API: nothing changes here, and the visitor retries the same submit.
  if (!result.ok && result.reason === "unavailable") return unavailable();
  if (!result.ok) {
    return contactView(invitation, campaign, {
      error: "We couldn't save that just now. Please try again in a moment — nothing was lost.",
    });
  }

  const done: Session = {
    ...session,
    s: "done",
    p: phone,
    k: result.confirmation,
    fn: invitation.firstName ? undefined : firstName || undefined,
  };
  await writeSession(done);
  return doneView(done, invitation, campaign);
}

/**
 * The result page polls this for visit times. Times exist only once UpDash has
 * turned the response into a lead (its cron runs about a minute after submit).
 */
export async function pollSlots(): Promise<SlotsResult> {
  const session = await readSession();
  if (session?.s !== "done") return { status: "off" };
  return getAppointmentSlots(session.b);
}

/** Book (or move) a visit — only after the response is in (session at the result). */
async function book(session: Session, fd: FormData): Promise<FlowView> {
  const found = await current(session);
  if ("step" in found) return found;
  const { invitation, campaign } = found;
  const date = String(fd.get("date") ?? "");
  const time = String(fd.get("time") ?? "").trim().slice(0, 12);
  const zone = String(fd.get("zone") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2} ?[AP]M$/i.test(time)) {
    return doneView(session, invitation, campaign, { bookError: "Please pick a day and a time." });
  }
  // A retry of the time this visitor already has: it's booked, so don't book (and text) it again.
  if (session.ap?.d === date && session.ap.t === time) return doneView(session, invitation, campaign);
  const r = await bookAppointment(session.b, date, time, session.ch);
  if (r.status === "booked") {
    const z = /^[A-Za-z][A-Za-z0-9_+/-]{1,40}$/.test(zone) ? zone : (session.ap?.z ?? "");
    const booked: Session = { ...session, ap: { d: date, t: time, w: r.when || `${date} at ${time}`, z } };
    await writeSession(booked);
    return doneView(booked, invitation, campaign);
  }
  if (r.status === "slot_unavailable") {
    return doneView(session, invitation, campaign, {
      bookError: "Sorry — that time was just taken. Here are the times still open.",
      bookState: "taken",
    });
  }
  if (r.status === "lead_not_ready") return doneView(session, invitation, campaign, { bookState: "not_ready" });
  if (r.status === "unavailable") return unavailable();
  if (r.status === "invalid") {
    return doneView(session, invitation, campaign, { bookError: "That time isn't available. Please pick another." });
  }
  // Booking is off or unavailable: hide the picker; the specialist will text.
  return doneView(session, invitation, campaign, { bookState: "off" });
}

/** The consent wording's version, recorded on the lead with the time and IP. Bump it when the wording changes. */
const CREDIT_CONSENT_VERSION = "aci-credit-1";

export type CreditOutcome = "ok" | "not_ready" | "invalid_ssn" | "invalid_dob" | "consent_required" | "error";

/**
 * The credit application, only after the response is in (session at done).
 * The SSN and date of birth pass straight through to the API: never stored in
 * the session, never logged. Only "sent" is remembered.
 */
export async function sendCredit(fd: FormData): Promise<CreditOutcome> {
  const session = await readSession();
  if (!session || session.s !== "done" || !session.p) return "error";
  if (session.ca) return "ok";
  if (fd.get("consent") !== "yes") return "consent_required";
  const ssn = String(fd.get("ssn") ?? "").replace(/\D/g, "");
  const dob = String(fd.get("dob") ?? "");
  if (ssn.length !== 9) return "invalid_ssn";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return "invalid_dob";
  const r = await sendCreditApplication(session.b, ssn, dob, CREDIT_CONSENT_VERSION, session.ch);
  if (r === "ok") {
    await writeSession({ ...session, ca: 1 });
    return "ok";
  }
  if (r === "lead_not_ready") return "not_ready";
  if (r === "invalid_ssn" || r === "invalid_dob" || r === "consent_required") return r;
  return "error";
}
