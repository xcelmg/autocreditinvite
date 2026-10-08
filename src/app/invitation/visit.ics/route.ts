import { lookupInvitation } from "@/lib/api";
import { dealerView } from "@/lib/flow";
import { readSession } from "@/lib/session";
import { site } from "@/lib/site";

/*
 * Add-to-calendar file for the visit booked on the result step. Built from
 * the signed session, so it only exists for the visitor who booked. The start
 * is in the dealership's local time (TZID from the API's slots).
 */

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");

/** Fold content lines to stay under 75 octets (RFC 5545 §3.1); 60 characters leaves room for multi-byte ones. */
const fold = (line: string) => line.match(/.{1,60}/gu)?.join("\r\n ") ?? line;

/** "4:30 PM" → "163000". */
function clock(time: string): string | null {
  const m = /^(\d{1,2}):(\d{2}) ?([AP])M$/i.exec(time.trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "P") h += 12;
  return `${String(h).padStart(2, "0")}${m[2]}00`;
}

export async function GET() {
  const s = await readSession();
  const ap = s?.s === "done" ? s.ap : undefined;
  const hhmmss = ap ? clock(ap.t) : null;
  if (!s || !ap || !hhmmss || !/^\d{4}-\d{2}-\d{2}$/.test(ap.d)) {
    return new Response("No visit is booked.", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const found = await lookupInvitation(s.b);
  const dealer = found.status === "found" ? dealerView(found.campaign) : null;
  const start = `${ap.d.replace(/-/g, "")}T${hhmmss}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const name = dealer?.name ?? "the dealership";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${site.name}//Visit//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${s.b}-${ap.d}@${new URL(site.url).hostname}`,
    `DTSTAMP:${stamp}`,
    ap.z ? `DTSTART;TZID=${ap.z}:${start}` : `DTSTART:${start}`,
    "DURATION:PT1H",
    `SUMMARY:${esc(`Visit with your specialist — ${name}`)}`,
    ...(dealer?.address ? [`LOCATION:${esc([dealer.name, dealer.address].join(", "))}`] : []),
    `DESCRIPTION:${esc(
      [
        `Meet your specialist at ${name} to talk through your financing options.`,
        s.k ? `Confirmation ${s.k}.` : "",
        "Bring your driver's license, proof of income, proof of residence, and your down payment and trade-in title or payoff if you have them.",
        dealer?.phone ? `Dealership phone: ${dealer.phone}.` : "",
      ]
        .filter(Boolean)
        .join(" "),
    )}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="my-auto-credit-visit.ics"',
      "Cache-Control": "no-store",
    },
  });
}
