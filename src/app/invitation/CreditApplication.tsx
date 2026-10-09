"use client";

import { useRef, useState } from "react";
import { pollSlots, sendCredit, type CreditOutcome } from "./actions";
import { Icon } from "@/components/Icon";
import { site } from "@/lib/site";

/*
 * The credit application — the main event of this site. The response (name,
 * mobile, consent) went to UpDash at the contact step; this form then asks for
 * the two things a credit pull needs beyond the invitation, SSN and date of
 * birth, plus an authorization for a hard inquiry. The values go to the server
 * action and on to the dealership through UpDash; this component clears them
 * once sent. It can only post once UpDash has made the lead from the response:
 * on lead_not_ready it watches the visit-times endpoint (which says when the
 * lead exists and isn't rate limited) and sends again once the lead is ready,
 * so the application itself is posted only a few times. "Skip for now" leaves
 * the response as it is; the specialist can take the application at the visit.
 */

/** How long to wait for UpDash to make the lead (seconds after the response, or the next cron run). */
const LEAD_WAIT_MS = 120_000;
const PROBE_MS = 2500;
/**
 * Delays before each resend once the lead is ready, or (when the site has no visit times to watch) while
 * waiting blind. The API takes 6 applications per IP in 10 minutes, so the first send plus these stays under it.
 */
const RESEND_READY_MS = [0, 6000, 12000];
const RESEND_BLIND_MS = [5000, 10000, 15000, 20000, 30000];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Wait until UpDash has made the lead: true once ready, false at the deadline, null when there's no way to tell. */
async function leadReady(): Promise<boolean | null> {
  const deadline = Date.now() + LEAD_WAIT_MS;
  while (Date.now() < deadline) {
    const r = await pollSlots().catch(() => ({ status: "waiting" as const }));
    if (r.status === "ready") return true;
    if (r.status === "off") return null;
    await sleep(PROBE_MS);
  }
  return false;
}

/** 123-45-6789 as it's typed. */
function formatSsn(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/** MM/DD/YYYY as it's typed. */
function formatDob(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** The SSA never issues area 000, 666 or 900–999, group 00 or serial 0000. */
function ssnError(v: string): string | undefined {
  const d = v.replace(/\D/g, "");
  if (d.length !== 9) return "Enter all 9 digits of your Social Security number.";
  const area = Number(d.slice(0, 3));
  if (area === 0 || area === 666 || area >= 900 || d.slice(3, 5) === "00" || d.slice(5) === "0000") {
    return "That doesn't look like a valid Social Security number. Please check it.";
  }
  return undefined;
}

function dobError(v: string): string | undefined {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return "Enter your date of birth as MM/DD/YYYY.";
  const [mm, dd, yyyy] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(yyyy, mm - 1, dd);
  if (date.getFullYear() !== yyyy || date.getMonth() !== mm - 1 || date.getDate() !== dd) return "That date doesn't exist. Please check it.";
  const now = new Date();
  const age = now.getFullYear() - yyyy - (now < new Date(now.getFullYear(), mm - 1, dd) ? 1 : 0);
  if (age < 18) return "You must be 18 or older to apply for financing.";
  if (age > 110) return "Please check the year.";
  return undefined;
}

const CONSENT_ERROR = "Please check the box to authorize the credit check — or skip for now.";

export function CreditApplication({
  dealer,
  firstName,
  confirmation,
  onDone,
}: {
  dealer: string;
  firstName: string | null;
  confirmation: string;
  /** Called once the application is sent, or when the visitor skips it. */
  onDone: (outcome: "sent" | "skipped") => void;
}) {
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState<"error" | "not_ready" | null>(null);
  const [ssn, setSsn] = useState("");
  const [showSsn, setShowSsn] = useState(false);
  const [dob, setDob] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<{ ssn?: string; dob?: string; consent?: string }>({});
  const [sending, setSending] = useState(false);
  const ssnRef = useRef<HTMLInputElement>(null);
  const dobRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  const ssnOk = !ssnError(ssn);
  const dobOk = !dobError(dob);

  return (
    <section aria-labelledby="credit-title" className="space-y-6 print:hidden">
      <div>
        <p className="eyebrow">Last step</p>
        <h1
          id="credit-title"
          data-step-heading
          tabIndex={-1}
          className="mt-2.5 font-display text-display-2 text-ink-950 outline-none"
        >
          Finish your credit application{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-3 text-body text-muted">
          We already have your name and address from your invitation. Add two things and {dealer} can review your
          application with its lenders before you visit.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-small text-brand-900">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
          <Icon name="check" className="h-3 w-3" strokeWidth={3} />
        </span>
        <span>
          <strong className="font-semibold">{dealer} has your contact details.</strong>{" "}
          {confirmation && (
            <>
              Confirmation <span className="tabular whitespace-nowrap font-mono font-semibold">{confirmation}</span>.
            </>
          )}
        </span>
      </div>

      <form
        className="space-y-5"
        noValidate
        autoComplete="off"
        onSubmit={async (e) => {
          e.preventDefault();
          const next = {
            ssn: ssnError(ssn),
            dob: dobError(dob),
            consent: consent ? undefined : CONSENT_ERROR,
          };
          setErrors(next);
          if (next.ssn) return ssnRef.current?.focus();
          if (next.dob) return dobRef.current?.focus();
          if (next.consent) return consentRef.current?.focus();
          setSending(true);
          setFailed(null);
          const [mm, dd, yyyy] = dob.split("/");
          const fd = new FormData();
          fd.set("ssn", ssn.replace(/\D/g, ""));
          fd.set("dob", `${yyyy}-${mm}-${dd}`);
          fd.set("consent", "yes");
          const send = () => sendCredit(fd).catch((): CreditOutcome => "error");
          let outcome = await send();
          if (outcome === "not_ready") {
            setWaiting(true);
            const ready = await leadReady();
            if (ready !== false) {
              for (const ms of ready ? RESEND_READY_MS : RESEND_BLIND_MS) {
                await sleep(ms);
                outcome = await send();
                if (outcome !== "not_ready") break;
              }
            }
          }
          setWaiting(false);
          setSending(false);
          if (outcome === "ok") {
            setSsn("");
            setDob("");
            onDone("sent");
            return;
          }
          if (outcome === "invalid_ssn") {
            setErrors({ ssn: "That doesn't look like a valid Social Security number. Please check it." });
            return ssnRef.current?.focus();
          }
          if (outcome === "invalid_dob") {
            setErrors({ dob: "Please check your date of birth." });
            return dobRef.current?.focus();
          }
          if (outcome === "consent_required") {
            setErrors({ consent: CONSENT_ERROR });
            return consentRef.current?.focus();
          }
          setFailed(outcome === "not_ready" ? "not_ready" : "error");
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex h-6 items-center justify-between">
              <label htmlFor="ssn" className="text-small font-semibold text-ink-900">
                Social Security number
              </label>
              <button
                type="button"
                className="-my-2 inline-flex min-h-11 items-center whitespace-nowrap px-1 text-caption font-semibold text-brand-700 underline-offset-2 hover:underline"
                aria-controls="ssn"
                aria-pressed={showSsn}
                aria-label={showSsn ? "Hide Social Security number" : "Show Social Security number"}
                onClick={() => setShowSsn((s) => !s)}
              >
                {showSsn ? "Hide" : "Show"}
              </button>
            </div>
            <div className="relative">
              <input
                ref={ssnRef}
                id="ssn"
                type={showSsn ? "text" : "password"}
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                placeholder="•••-••-••••"
                value={ssn}
                onChange={(e) => (setSsn(formatSsn(e.target.value)), setErrors((x) => ({ ...x, ssn: undefined })))}
                className="field tabular h-14 text-[1.2rem] font-medium tracking-wide"
                aria-invalid={!!errors.ssn}
                aria-describedby={errors.ssn ? "ssn-error" : undefined}
              />
              <Valid show={ssnOk && !errors.ssn} />
            </div>
            <FieldMessage id="ssn-error" error={errors.ssn} />
          </div>
          <div>
            <label htmlFor="dob" className="mb-1.5 flex h-6 items-center text-small font-semibold text-ink-900">
              Date of birth
            </label>
            <div className="relative">
              <input
                ref={dobRef}
                id="dob"
                inputMode="numeric"
                autoComplete="bday"
                placeholder="MM/DD/YYYY"
                value={dob}
                onChange={(e) => (setDob(formatDob(e.target.value)), setErrors((x) => ({ ...x, dob: undefined })))}
                className="field tabular h-14 text-[1.2rem] font-medium tracking-wide"
                aria-invalid={!!errors.dob}
                aria-describedby={errors.dob ? "dob-error" : undefined}
              />
              <Valid show={dobOk && !errors.dob} />
            </div>
            <FieldMessage id="dob-error" error={errors.dob} />
          </div>
        </div>

        <p className="flex items-start gap-2.5 text-small text-ink-700">
          <Icon name="info" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-accent-600" />
          <span>
            <strong className="font-semibold text-ink-900">This is a hard credit inquiry.</strong> It appears on your
            credit report and may affect your credit score. Not everyone will qualify.
          </span>
        </p>

        <div>
          <label
            className={`flex gap-3 rounded-lg border p-4 text-[14px] leading-relaxed text-ink-700 ${errors.consent ? "border-oops-700/30 bg-oops-50" : "border-line bg-canvas"}`}
          >
            <input
              ref={consentRef}
              type="checkbox"
              checked={consent}
              onChange={(e) => (setConsent(e.target.checked), setErrors((x) => ({ ...x, consent: undefined })))}
              className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
              aria-invalid={!!errors.consent}
              aria-describedby={errors.consent ? "credit-consent-error" : undefined}
            />
            <span>
              By checking this box and selecting &ldquo;Authorize and send,&rdquo; I am providing written instructions
              under the Fair Credit Reporting Act authorizing {dealer}, and the lenders and other financing sources to
              which {dealer} submits my application, to obtain my consumer credit report and credit score from one or
              more consumer reporting agencies to evaluate my application for vehicle financing.{" "}
              <strong className="font-semibold text-ink-900">
                I understand this is a hard credit inquiry that will appear on my credit report and may lower my credit score.
              </strong>{" "}
              I certify that the information I provide is true and complete, and I authorize {dealer} and its financing
              sources to verify it. I understand that {site.name} is not a lender and only passes my application to{" "}
              {dealer}. Sending this application is optional, and I may withdraw this authorization before my report is
              obtained by contacting {dealer}.
            </span>
          </label>
          <FieldMessage id="credit-consent-error" error={errors.consent} />
        </div>
        {failed && (
          <p role="alert" className="rounded-lg border border-oops-700/30 bg-oops-50 px-4 py-3 text-[14px] font-medium text-oops-700">
            {failed === "not_ready"
              ? `${dealer} is still setting up your file. Please try again in a few minutes — or skip for now, and your specialist can take your application at your visit.`
              : `We couldn't send your application just now. ${dealer} still has your contact details — please try again in a few minutes, or your specialist can take your application at your visit.`}
          </p>
        )}
        <div aria-live="polite" className="sr-only">
          {waiting ? `Setting up your file at ${dealer}, then sending your application.` : ""}
        </div>
        <button
          type="submit"
          disabled={sending}
          aria-disabled={!(ssnOk && dobOk && consent) || undefined}
          className={`btn-primary w-full px-6 py-3.5 text-[17px] ${sending ? "shimmer shimmer-dark" : ""}`}
        >
          {sending ? (
            <span className="inline-flex items-center gap-2.5">
              <Icon name="lock" className="h-[18px] w-[18px] shrink-0" />{" "}
              <span className="truncate">{waiting ? "Setting up…" : "Sending securely…"}</span>
            </span>
          ) : (
            <>
              <span>Authorize and send</span> <Icon name="arrow" className="h-5 w-5" />
            </>
          )}
        </button>
        <p className="flex items-start justify-center gap-2 text-center text-small text-muted">
          <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
          <span>
            {!sending
              ? `Encrypted, shared only with ${dealer} and the lenders it sends your application to, and never sold.`
              : waiting
                ? `Setting up your file at ${dealer}, then sending your application.`
                : `Sending securely to ${dealer}…`}
          </span>
        </p>
      </form>

      <div className="border-t border-line pt-4 text-center">
        <button
          type="button"
          disabled={sending}
          className="inline-flex min-h-11 items-center whitespace-nowrap text-small font-medium text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink-900"
          onClick={() => {
            setSsn("");
            setDob("");
            setConsent(false);
            setErrors({});
            onDone("skipped");
          }}
        >
          Skip for now
        </button>
        <p className="text-caption text-muted">Your specialist can take it at your visit.</p>
      </div>
    </section>
  );
}

function Valid({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      className="pop-in pointer-events-none absolute right-3.5 top-1/2 -mt-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-600"
      aria-hidden="true"
    >
      <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.5} />
    </span>
  );
}

function FieldMessage({ id, error }: { id: string; error?: string }) {
  return (
    <div aria-live="polite">
      {error && (
        <p id={id} className="mt-1.5 text-[14px] font-medium text-oops-700">
          {error}
        </p>
      )}
    </div>
  );
}
