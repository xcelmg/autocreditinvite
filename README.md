# autocreditinvite.com — My Auto Credit

The **My Auto Credit** response microsite, a rebuild of the old AutoCreditInvite.com. People who got a mailer
enter its 9-digit Invitation Code, confirm it's them, leave a mobile number and then **send their auto credit
application** (SSN + date of birth + a hard-inquiry authorization) to the participating dealership. A specialist
there texts them, and they can book a visit. Responses land in **UpDash** with Source **`AutoCreditInvite.com`**
(unchanged from the old site, so reporting carries on); the confirmation-number prefix is set API-side.

Next.js 16 (App Router) + Tailwind 4 on Vercel. All data and lead writes go through the shared **microsites-api**
— this site holds a site key, no database account. There is no text-verification step.

## The flow (`/invitation`)

```
Code ──► Identity ──► A few questions ──► Contact ──► Credit application ──► Result
 │          │               │                 │                │                  │
 │          │               │                 │                │                  └ outcome, visit booking,
 │          │               │                 │                │                    confirmation card, what's
 │          │               │                 │                │                    next, what to bring
 │          │               │                 │                └ SSN + date of birth + FCRA consent →
 │          │               │                 │                  POST /v1/credit-applications. Shown first and
 │          │               │                 │                  expanded; "Skip for now — my specialist can take
 │          │               │                 │                  it at my visit" goes to the result (which offers
 │          │               │                 │                  "Finish it now")
 │          │               │                 └ mobile (required), email (optional), name only if the invitation
 │          │               │                   has none, text consent → POST /v1/responses (the lead is queued)
 │          │               └ optional tap-to-choose credit-situation questions; "Skip" sends nothing
 │          └ "Is this you?" — name + masked address, dealership; "That's not me" clears the session
 └ POST /v1/invitations/lookup (404 / 410 inactive / 429 / 503 each explained)
```

Why the response goes first: the API only takes a credit application once UpDash has turned the response into a
lead (seconds after it is queued, or the next cron run). If the visitor is faster, the API answers
`lead_not_ready`; the form then watches `POST /v1/appointments/slots` (which reports when the lead exists and has
no rate limit) and sends again once it does, so the application itself is posted only a few times — the API
allows 6 per IP in 10 minutes.

The SSN and date of birth go from the form to the server action and straight on to the API: never stored in the
session cookie, never logged, cleared from the form once sent. The session only remembers that the application
was sent (`ca: 1`). The consent wording's version is `aci-credit-1` (`CREDIT_CONSENT_VERSION` in
`src/app/invitation/actions.ts`); bump it whenever the consent text in `CreditApplication.tsx` changes. The API
stamps the authorization with the server time and the visitor's IP.

The visitor's place in the flow lives in an HMAC-signed, httpOnly cookie (`mac_s`, 2 hours).

### `details` sent with the response

Only the questions the visitor answered, using the exact enum strings from microsites-api's `src/lib/details.ts`
(see `src/lib/details.ts` here): `bankruptcy`, `repo`, `creditScore`, `downPayment`, `vehicleType`, `buyTime`,
`tradeIn`.

**No pre-qualified range.** The site never displays `campaign.offer.low` / `high`; only `offer.expires` is used,
as "valid through".

## API flags this site needs

In the API's `MICROSITE_SITES` entry for this site:

```json
{ "id": "autocreditinvite", "name": "My Auto Credit", "source": "AutoCreditInvite.com",
  "confirmationPrefix": "MAC", "keySha256": "<sha256 of the site key>",
  "appointments": true, "creditApp": true }
```

- `creditApp: true` — the lookup returns `creditApp: true` and `/v1/credit-applications` accepts this site.
  Without it the result skips the credit application entirely (the site still takes responses).
- `appointments: true` — visit booking on the result, and the lead-readiness signal the credit application waits
  on. Without it the credit form falls back to timed resends.

## Copy rules

Always "Invitation Code", never "PIN" — not even in the "where's my code" help. The specialist
*texts* — never promise "no calls". Never promise approval, rates or payments ("not everyone will qualify").
Entering the code and contact details doesn't check credit; the credit application is a hard inquiry that may
affect the score, and every place that mentions it says so.

## Entry points

- Printed URL `autocreditinvite.com` — the Invitation Code box is the first thing on the page.
- QR deep link `https://autocreditinvite.com/p/123456789` (dashes optional) — sets the session and opens at
  "Is this you?". UpDash's personalized QR redirect (`…?pin=<code>` on any page) is sent there by `src/proxy.ts`,
  UTMs kept. `/p/` is disallowed in `robots.txt`.
- Funnel events (`visit`, `opened`, `found`, `not_found`, `inactive`, `confirmed`, `not_me`; the API records
  `submitted`) as on the other microsites.
- Legacy paths (`/index.php`, `/index.html`, `/invitation.html`, `/pin/<code>`, …) redirect.

## Environment variables (Vercel → Settings → Environment Variables)

| Name | What |
|---|---|
| `MICROSITES_API_URL` | the microsites-api production URL |
| `MICROSITES_API_KEY` | this site's key (Sensitive) — the API stores only its hash |
| `SESSION_SECRET` | 32+ random chars; signs the session cookie (required in production) |
| `NEXT_PUBLIC_SITE_URL` | optional; default `https://autocreditinvite.com` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | optional; the address on the privacy and terms pages (default `support@updash.com`) |

Check the wiring at **`/api/health`**. The demo banner shows whenever the API is in demo mode.

## Development

Run microsites-api locally in demo mode with this site's entry (above), then put this in `.env.local`
(git-ignored):

```
MICROSITES_API_URL=http://127.0.0.1:3291
MICROSITES_API_KEY=<this site's local key>
SESSION_SECRET=<32+ random chars>
```

```bash
npm ci
npm run dev            # http://localhost:3321
npx tsc --noEmit && npx eslint src && npm run build
npm test               # Playwright: home copy rules, full flow to the credit application and booking, skip path
```

Demo Invitation Code: `123-456-789` (Jordan Mitchell, ABC Motors). The demo lead becomes ready about 20 s after
the response, so the credit test waits. Use a test SSN such as 219-09-9999 — never 123-45-6789.
`npm test` reuses a server on `BASE_URL` (default `http://localhost:3321`) or starts `npm run dev`; set
`PLAYWRIGHT_BROWSERS_PATH` if your browsers live elsewhere.

## Design notes

Clean, cool and direct — deliberately unlike the warm paper of the other microsites. A cool white canvas
(`#f5f7fa`) and white cards (`#ffffff`, 16px radius, one soft shadow); deep charcoal ink (`#16181d`) for type and
for the one dark object, the hero's "Your application" panel; one confident blue for every action (`#1d5ad6`,
white text 6.0:1; hover `#1748b0`); and the old AutoCredit red (`#d60000`) kept to the logo's check, the short
rule under section labels and the hard-inquiry icon. Errors use `#b42318`. Every text colour pairing was checked
against WCAG AA (red is 5.4:1 on white, so it would pass for text, but it stays decorative). Headlines and the
wordmark are **Sora** (geometric, tight tracking), reading text **Hanken Grotesk**, both self-hosted via
`@fontsource-variable`; the OG image reads Sora's WOFF files from `assets/`.

The logo (`src/components/Mark.tsx`, `Logo.tsx`) is a rounded shield with a check — a redraw of the old badge's
red check over a gear: the shield in charcoal, the red check running out past its right shoulder, with a gap cut
where they cross. The wordmark is "my" small, "Auto" charcoal, "Credit" blue. The favicon is the one-colour mark
in white on blue; the apple icon is white shield, red check on charcoal. No photographs.

Motion, the print stylesheet, the Invitation Code field's no-clip rule and the reveal gate (`html.mac-motion`)
work as on the other microsites, and all of it collapses under `prefers-reduced-motion`.

Secrets belong in Vercel env vars — never in this repo.
