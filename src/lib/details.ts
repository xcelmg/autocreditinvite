/*
 * The optional "A few questions" step: the visitor's credit situation and plans. Values are the exact enum strings
 * microsites-api accepts in `details` (its src/lib/details.ts); labels are what
 * the visitor sees. Shared by the client UI and the server action.
 */

export type DetailKey = "bankruptcy" | "repo" | "creditScore" | "downPayment" | "vehicleType" | "buyTime" | "tradeIn";

export const QUESTIONS = {
  bankruptcy: [
    { value: "none", label: "None" },
    { value: "discharged", label: "Discharged" },
    { value: "open", label: "Still open" },
  ],
  repo: [
    { value: "none", label: "None" },
    { value: "past", label: "2+ years ago" },
    { value: "recent", label: "Within 2 years" },
  ],
  creditScore: [
    { value: "excellent", label: "Excellent" },
    { value: "good", label: "Good" },
    { value: "fair", label: "Fair" },
    { value: "rebuilding", label: "Rebuilding" },
    { value: "unsure", label: "Not sure" },
  ],
  downPayment: [
    { value: "0", label: "$0" },
    { value: "500", label: "$500" },
    { value: "1000", label: "$1,000" },
    { value: "2500", label: "$2,500" },
    { value: "5000+", label: "$5,000+" },
  ],
  vehicleType: [
    { value: "car", label: "Car" },
    { value: "suv", label: "SUV" },
    { value: "truck", label: "Truck" },
    { value: "van", label: "Van / minivan" },
    { value: "any", label: "Open to anything" },
  ],
  buyTime: [
    { value: "now", label: "Right away" },
    { value: "30days", label: "Within 30 days" },
    { value: "90days", label: "In 1–3 months" },
    { value: "later", label: "Just exploring" },
  ],
  tradeIn: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ],
} as const satisfies Record<DetailKey, readonly { value: string; label: string }[]>;

export const DETAIL_KEYS = Object.keys(QUESTIONS) as DetailKey[];

export type Details = { [K in DetailKey]?: (typeof QUESTIONS)[K][number]["value"] };

/** Keep only known keys with whitelisted values. */
export function cleanDetails(raw: Record<string, unknown>): Details {
  const out: Record<string, string> = {};
  for (const k of DETAIL_KEYS) {
    const v = raw[k];
    if (typeof v === "string" && QUESTIONS[k].some((o) => o.value === v)) out[k] = v;
  }
  return out as Details;
}
