import "server-only";
import { lookupInvitation, type Campaign, type Invitation } from "./api";
import type { Details } from "./details";
import type { Session } from "./session";
import { formatPhone } from "./format";

/*
 * What the invitation portal shows at each step. Built on the server from the
 * signed session and the microsites API, then handed to the client as data.
 * The site never shows a pre-qualified range: campaign.offer.low/high are
 * deliberately unused (only offer.expires, as "valid through").
 *
 *   code → identity ("Is this you?") → answers ("A few questions") → contact
 *        → done (the credit application first, then the confirmation and visit booking)
 */

export type DealerView = {
  name: string;
  city: string;
  address: string;
  phone: string | null;
  phoneHref: string | null;
};

/** Why a step's request didn't get through: the visitor's connection, or the microsites API not answering. */
export type Failure = "network" | "unavailable";

export type FlowView = (
  | { step: "code"; code?: string; error?: string; notice?: string }
  | {
      step: "identity";
      firstName: string | null;
      holderName: string | null;
      maskedAddress: string | null;
      dealer: DealerView;
      alreadyResponded: boolean;
      /** "October 25, 2026", when the campaign has an end date. */
      expires: string | null;
    }
  | { step: "answers"; firstName: string | null; dealer: DealerView; answers: Details }
  | {
      step: "contact";
      dealer: DealerView;
      needName: boolean;
      expires: string | null;
      error?: string;
      fieldErrors?: Record<string, string>;
    }
  | {
      step: "done";
      firstName: string | null;
      confirmation: string;
      dealer: DealerView;
      expires: string | null;
      phone: string;
      /** Mailed vehicle ("2019 Honda Accord"), for the trade-in checklist line. */
      tradeIn: string | null;
      /** The visitor's trade-in answer, if they gave one. */
      hasTradeIn: "yes" | "no" | null;
      /** The booked visit ("Saturday, October 4 at 4:30 PM"), if any. */
      booked: { date: string; time: string; when: string } | null;
      /** Booking problem to show in the picker. */
      bookError?: string;
      /** What the last booking attempt needs the picker to do: refresh times, wait for the lead, or hide. */
      bookState?: "taken" | "not_ready" | "off";
      /** The credit application: "offer" it (the result opens on it), "sent" already, or "off" for this site. */
      credit: "offer" | "sent" | "off";
    }
) & {
  /**
   * Set when the last request didn't get through. The client keeps the screen (and what was typed) and shows a
   * retry alert for the button that sent `intent`; `at` re-keys the alert on each failure.
   */
  failed?: { kind: Failure; intent: string; at: number };
};

/** What a step returns when the microsites API didn't answer: the client keeps the current screen and offers a retry. */
export function unavailable(): FlowView {
  return { step: "code", failed: { kind: "unavailable", intent: "", at: Date.now() } };
}

export function dealerView(c: Campaign): DealerView {
  const d = c.dealer;
  return {
    name: d.name,
    city: [d.city, d.state].filter(Boolean).join(", "),
    address: [d.address, [d.city, [d.state, d.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")]
      .filter(Boolean)
      .join(", "),
    phone: d.phone,
    phoneHref: d.phoneHref,
  };
}

/** "2026-08-01" → "August 1, 2026". */
export function longDate(iso: string | null): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function vehicleText(inv: Invitation): string | null {
  const v = inv.vehicle;
  if (!v) return null;
  const s = [v.year, v.make, v.model].filter(Boolean).join(" ").trim();
  return s && (v.make || v.model) ? s : null;
}

export function identityView(inv: Invitation, campaign: Campaign): FlowView {
  return {
    step: "identity",
    firstName: inv.firstName,
    holderName: inv.firstName ? [inv.firstName, inv.lastName].filter(Boolean).join(" ") : null,
    maskedAddress: inv.maskedAddress,
    dealer: dealerView(campaign),
    alreadyResponded: inv.alreadyResponded,
    expires: longDate(campaign.offer.expires),
  };
}

export function answersView(inv: Invitation, campaign: Campaign, answers: Details = {}): FlowView {
  return { step: "answers", firstName: inv.firstName, dealer: dealerView(campaign), answers };
}

export function contactView(inv: Invitation, campaign: Campaign, extra: Partial<FlowView> = {}): FlowView {
  return {
    step: "contact",
    dealer: dealerView(campaign),
    needName: inv.needsName,
    expires: longDate(campaign.offer.expires),
    ...extra,
  } as FlowView;
}

/** The result. Visit times aren't included: the client polls for them (see pollSlots) once the lead exists. */
export function doneView(
  s: Session,
  inv: Invitation,
  campaign: Campaign,
  extra: { bookError?: string; bookState?: "taken" | "not_ready" | "off" } = {},
): FlowView {
  return {
    step: "done",
    firstName: inv.firstName || s.fn || null,
    confirmation: s.k ?? "",
    dealer: dealerView(campaign),
    expires: longDate(campaign.offer.expires),
    phone: formatPhone(s.p ?? ""),
    tradeIn: vehicleText(inv),
    hasTradeIn: s.d?.tradeIn ?? null,
    booked: s.ap ? { date: s.ap.d, time: s.ap.t, when: s.ap.w } : null,
    bookError: extra.bookError,
    bookState: extra.bookState,
    credit: s.ca ? "sent" : campaign.creditApp ? "offer" : "off",
  };
}

/** Rebuild the current screen from the session (page load / refresh). */
export async function viewFromSession(s: Session | null): Promise<FlowView> {
  if (!s) return { step: "code" };
  const found = await lookupInvitation(s.b);
  if (found.status !== "found") return { step: "code" };
  const { invitation, campaign } = found;
  if (s.s === "identity") return identityView(invitation, campaign);
  if (s.s === "answers") return answersView(invitation, campaign, s.d);
  if (s.s === "contact") return contactView(invitation, campaign);
  if (s.s === "done" && s.p && s.k) return doneView(s, invitation, campaign);
  return { step: "code" };
}
