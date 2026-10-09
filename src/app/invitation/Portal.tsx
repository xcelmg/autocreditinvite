"use client";

import {
  addTransitionType,
  startTransition,
  useActionState,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  ViewTransition,
} from "react";
import Link from "next/link";
import { flowAction, pollSlots } from "./actions";
import { bookRetryMessage, retryMessage } from "@/lib/retry";
import type { Slots } from "@/lib/api";
import { Checking, MIN_CHECK_MS, wait } from "@/components/Checking";
import type { FlowView } from "@/lib/flow";
import { QUESTIONS, type DetailKey, type Details } from "@/lib/details";
import { BRING } from "@/lib/bring";
import { formatPhoneInput, formatPin, mapsUrl } from "@/lib/format";
import { Icon } from "@/components/Icon";
import { CodeHelp } from "@/components/CodeHelp";
import { ReservationCard } from "@/components/ReservationCard";
import { Reveal } from "@/components/Motion";
import { CreditApplication } from "./CreditApplication";

type Step = FlowView["step"];

/** Intents that go back a step; their transition slides the other way. */
const BACK_INTENTS = new Set(["back", "notme", "restart"]);

/** Context the steps need about what's in flight (for the checking / sending states). */
type Busy = { intent: string; dealer: string | null };

/** How the credit application ended in this visit: sent, skipped, or still open (null). */
type CreditDone = "sent" | "skipped" | null;

/**
 * Post a step. A request that doesn't get through (no signal, a timeout, the API down) keeps this screen and what
 * was typed, and flags a retry alert for the button that sent it.
 */
async function post(prev: FlowView, fd: FormData): Promise<FlowView> {
  const next = await flowAction(prev, fd).catch((): FlowView => ({ step: "code", failed: { kind: "network", intent: "", at: 0 } }));
  if (!next.failed) return next;
  const intent = String(fd.get("intent") ?? "") + (fd.get("skip") ? ":skip" : "");
  return { ...prev, failed: { kind: next.failed.kind, intent, at: Date.now() } };
}

/** The checkboxes, radios and selects on the current screen, in page order. */
const choices = (el: HTMLElement | null) =>
  [...(el?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input[type=checkbox], input[type=radio], select") ?? [])];

/** What each of those holds: ticked or not, or the chosen option. */
const picked = (el: HTMLElement | null) => choices(el).map((c) => (c instanceof HTMLSelectElement ? c.value : c.checked));

export function Portal({ initial }: { initial: FlowView }) {
  const [busy, setBusy] = useState<Busy>({ intent: "", dealer: null });
  // How the credit application ended on the result in this visit: sent, skipped, or still open (null).
  const [credit, setCredit] = useState<CreditDone>(null);
  const [view, dispatch, pending] = useActionState<FlowView, FormData>(async (prev, fd) => {
    if (fd.get("intent") !== "code") return post(prev, fd);
    // The Invitation Code check plays for at least ~900 ms on success; a failure shows at once.
    const started = Date.now();
    const next = await post(prev, fd);
    if (next.step === "code") return next;
    if (next.step === "identity") setBusy({ intent: "code", dealer: next.dealer.name });
    await wait(MIN_CHECK_MS - (Date.now() - started));
    return next;
  }, initial);
  const topRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const ticks = useRef<(boolean | string)[]>([]);

  // React resets a form once its action settles. A failed send stays on the same screen, and the reset would clear
  // the checkboxes, radios and selects the visitor chose (their state still holds them), so put them back.
  useEffect(() => {
    if (!view.failed) return;
    const now = choices(topRef.current);
    if (now.length !== ticks.current.length) return;
    now.forEach((c, i) => {
      if (c instanceof HTMLSelectElement) c.value = String(ticks.current[i]);
      else c.checked = ticks.current[i] === true;
    });
  }, [view.failed]);
  // A new trip through the flow starts with the credit application open again.
  if (view.step !== "done" && credit) setCredit(null);
  const creditDone: CreditDone = view.step === "done" && view.credit === "sent" ? "sent" : credit;
  // The result opens on the credit application; once it's sent or skipped, the result itself shows.
  const applying = view.step === "done" && view.credit === "offer" && !creditDone;
  const screen = view.step === "done" ? (applying ? "apply" : "result") : view.step;

  /** The credit application finished (or was skipped, or reopened): slide to the next screen. */
  const finishCredit = (outcome: CreditDone) => {
    startTransition(() => {
      addTransitionType(outcome ? "step-forward" : "step-back");
      setCredit(outcome);
    });
  };

  /** Every form posts through here: note what's in flight, and tag the step transition's direction. */
  const action = (fd: FormData) => {
    const intent = String(fd.get("intent") ?? "");
    ticks.current = picked(topRef.current);
    setBusy({ intent, dealer: null });
    startTransition(() => {
      addTransitionType(BACK_INTENTS.has(intent) ? "step-back" : "step-forward");
      dispatch(fd);
    });
  };

  // On each step change: bring the card into view and move focus to its heading. This runs
  // in the layout phase, before the view transition captures the new step, so the slide
  // plays in place instead of fighting a scroll.
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = topRef.current;
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "instant", block: "start" });
    el?.querySelector<HTMLElement>("[data-step-heading]")?.focus({ preventScroll: true });
  }, [screen]);

  const ctx = { busy: pending ? busy : null };

  return (
    <div ref={topRef} className="mx-auto max-w-2xl scroll-mt-20 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <Stepper step={view.step} complete={screen === "result"} />
      <ViewTransition
        key={screen}
        enter={{ "step-back": "step-back", "step-forward": "step-fwd", default: "none" }}
        exit={{ "step-back": "step-back", "step-forward": "step-fwd", default: "none" }}
        default="none"
      >
        <div className="card mt-8 p-5 sm:p-9">
          {view.step === "code" && <CodeStep view={view} action={action} pending={pending} {...ctx} />}
          {view.step === "identity" && <IdentityStep view={view} action={action} pending={pending} />}
          {view.step === "answers" && <AnswersStep view={view} action={action} pending={pending} />}
          {view.step === "contact" && <ContactStep view={view} action={action} pending={pending} {...ctx} />}
          {view.step === "done" &&
            (applying ? (
              <CreditApplication
                dealer={view.dealer.name}
                firstName={view.firstName}
                confirmation={view.confirmation}
                onDone={finishCredit}
              />
            ) : (
              <DoneStep view={view} action={action} pending={pending} credit={creditDone} onReopen={() => finishCredit(null)} />
            ))}
        </div>
      </ViewTransition>
      <p className="mt-6 flex items-start justify-center gap-2 text-center text-caption text-muted print:hidden sm:items-center">
        <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
        <span>Encrypted connection · Shared only with your dealership and its lenders · Never sold</span>
      </p>
    </div>
  );
}

// ── Stepper ─────────────────────────────────────────────────────────────

const STEPS: { key: Step; label: string }[] = [
  { key: "code", label: "Code" },
  { key: "identity", label: "That's me" },
  { key: "answers", label: "A few questions" },
  { key: "contact", label: "Contact" },
  { key: "done", label: "Credit application" },
];

function Stepper({ step, complete }: { step: Step; complete: boolean }) {
  const at = STEPS.findIndex((s) => s.key === step);
  // Once the credit application is sent or skipped, every step is complete.
  const current = complete ? STEPS.length : at;
  const left = STEPS.length - 1 - at;
  return (
    <nav aria-label="Progress" className="print:hidden">
      <p className="sr-only">
        {complete ? "All steps complete" : `Step ${at + 1} of ${STEPS.length}: ${STEPS[at].label}`}
      </p>
      <ol className="flex items-start" aria-hidden="true">
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s.key} className="relative flex flex-1 flex-col items-center">
              {i < STEPS.length - 1 && (
                <span className="absolute left-1/2 top-[13px] h-px w-full bg-line-strong">
                  <span
                        className="block h-full origin-left bg-brand-600 transition-transform duration-[450ms] ease-out"
                    style={{ transform: `scaleX(${done ? 1 : 0})` }}
                  />
                </span>
              )}
              <span
                className={`tabular relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold transition-all duration-300 ${
                  done
                    ? "bg-brand-600 text-white"
                    : active
                      ? "bg-paper text-brand-700 ring-[1.5px] ring-brand-600 shadow-[0_0_0_5px_color-mix(in_srgb,var(--color-brand-600)_14%,transparent)]"
                      : "bg-paper text-subtle ring-1 ring-line-strong"
                }`}
              >
                {done ? (
                  <span key="done" className="pop-in">
                    <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.75} />
                  </span>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`mt-2.5 hidden whitespace-nowrap text-caption font-medium sm:block ${
                  active ? "text-ink-900" : done ? "text-ink-700" : "text-muted"
                }`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-center text-caption font-medium text-ink-700 sm:hidden" aria-hidden="true">
        {complete
          ? "All done"
          : `Step ${at + 1} of ${STEPS.length} · ${STEPS[at].label}${left === 1 ? " · one more after this" : ""}`}
      </p>
    </nav>
  );
}

// ── Shared bits ─────────────────────────────────────────────────────────────

type StepProps<S extends Step> = {
  view: Extract<FlowView, { step: S }>;
  action: (fd: FormData) => void;
  pending: boolean;
  busy?: Busy | null;
};

function Title({ kicker, children, sub }: { kicker?: string; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      {kicker && <p className="eyebrow">{kicker}</p>}
      <h1
        data-step-heading
        tabIndex={-1}
        className={`font-display text-display-2 text-ink-950 outline-none ${kicker ? "mt-2.5" : ""}`}
      >
        {children}
      </h1>
      {sub && <p className="mt-3 text-body text-muted">{sub}</p>}
    </div>
  );
}

function Alert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "info" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`fade-up flex items-start gap-2.5 rounded-lg border px-4 py-3 text-small font-medium ${
        tone === "error" ? "border-oops-700/25 bg-oops-50 text-oops-700" : "border-brand-100 bg-brand-50 text-brand-800"
      }`}
    >
      <Icon name={tone === "error" ? "alert" : "info"} className="mt-px h-[18px] w-[18px] shrink-0" strokeWidth={2} />
      <span>{children}</span>
    </p>
  );
}

/** The retry alert when the last request from this screen didn't get through; `label` is the button that sent it. */
function Retry({ view, label }: { view: FlowView; label: string }) {
  if (!view.failed) return null;
  return <Alert key={view.failed.at}>{retryMessage(view.failed.intent === "back" ? "Back" : label)}</Alert>;
}

function Primary({
  pending,
  children,
  pendingLabel,
  working = false,
  blocked = false,
}: {
  pending: boolean;
  children: React.ReactNode;
  pendingLabel: string;
  /** Show the quiet "working" sweep on the button while this form's request runs. */
  working?: boolean;
  /** Look disabled but stay clickable, so the form can say what's missing. */
  blocked?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={blocked || undefined}
      className={`btn-primary w-full px-6 py-3.5 text-[17px] ${working ? "shimmer shimmer-dark" : ""}`}
    >
      {pending ? (
        <span key="pending" className="fade-up inline-flex items-center gap-2.5">
          {working && <Icon name="lock" className="h-[18px] w-[18px] shrink-0" />}
          <span className="truncate">{pendingLabel}</span>
        </span>
      ) : (
        <>
          <span>{children}</span> <Icon name="arrow" className="h-5 w-5" />
        </>
      )}
    </button>
  );
}

/** "Your invitation is valid through …" — real urgency, only when the campaign has an end date. */
function ValidThrough({ expires }: { expires: string | null }) {
  if (!expires) return null;
  return (
    <p className="flex items-center gap-2 text-small text-ink-700">
      <Icon name="calendar" className="h-4 w-4 shrink-0 text-brand-700" />
      <span>
        Your invitation is valid through <strong className="font-semibold text-ink-900">{expires}</strong>.
      </span>
    </p>
  );
}

// ── 1. Code ─────────────────────────────────────────────────────────────────

function CodeStep({ view, action, pending, busy }: StepProps<"code">) {
  const checking = pending && busy?.intent === "code";
  const [code, setCode] = useState(formatPin(view.code ?? ""));
  const [help, setHelp] = useState(false);
  const [edited, setEdited] = useState<object | null>(null);
  const failed = edited === view ? undefined : view.failed;
  const error = edited === view || failed ? undefined : view.error;
  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="intent" value="code" />
      <Title kicker="Welcome" sub="Enter the Invitation Code from your mailer and we'll find your invitation.">
        Let&apos;s find your invitation.
      </Title>
      <div>
        <label htmlFor="code" className="mb-2 block text-small font-semibold text-ink-900">
          Invitation Code <span className="font-normal text-muted">— 9 digits</span>
        </label>
        <input
          id="code"
          name="code"
          value={code}
          onChange={(e) => {
            setCode(formatPin(e.target.value));
            setEdited(view);
          }}
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          placeholder="123-456-789"
          maxLength={11}
          readOnly={checking}
          aria-invalid={!!error}
          aria-describedby={error ? "code-msg" : undefined}
          className="field code-field h-14"
        />
      </div>
      {checking ? (
        <Checking dealer={busy?.dealer ?? null} />
      ) : (
        <div aria-live="polite" id="code-msg">
          {failed ? (
            <Retry view={view} label="Find my invitation" />
          ) : error ? (
            <Alert>{error}</Alert>
          ) : view.notice ? (
            <Alert tone="info">{view.notice}</Alert>
          ) : null}
        </div>
      )}
      <Primary pending={pending} pendingLabel="Checking…">
        Find my invitation
      </Primary>
      <div className="text-center">
        <button
          type="button"
          onClick={() => setHelp((h) => !h)}
          aria-expanded={help}
          aria-controls="portal-code-help"
          className="link inline-flex min-h-11 items-center whitespace-nowrap text-small"
        >
          Where&apos;s my Invitation Code?
        </button>
      </div>
      {help && <CodeHelp id="portal-code-help" />}
    </form>
  );
}

// ── 2. Identity ─────────────────────────────────────────────────────────────

function IdentityStep({ view, action, pending }: StepProps<"identity">) {
  return (
    <div className="space-y-6">
      <Title kicker="Invitation found" sub="Please check that this invitation is yours. For your privacy, we only show part of the address.">
        Is this you{view.firstName ? `, ${view.firstName}` : ""}?
      </Title>
      {view.alreadyResponded && (
        <Alert tone="info">You&apos;ve responded to this invitation before — that&apos;s fine. Continue to update your request.</Alert>
      )}
      <div className="overflow-hidden rounded-xl border border-line">
        <div className="flex items-center gap-4 bg-canvas p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700">
            <Icon name="user" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="label">Invitation for</p>
            {view.holderName ? (
              <p className="mt-0.5 font-display text-display-3 text-ink-950">{view.holderName}</p>
            ) : (
              <p className="text-lg font-semibold text-ink-900">The person named on your mailer</p>
            )}
            {view.maskedAddress && <p className="mt-0.5 break-words text-small text-muted">{view.maskedAddress}</p>}
          </div>
        </div>
        <div className="space-y-3 border-t border-line bg-paper p-5">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-ink-800">
              <Icon name="store" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="label">Your dealership</p>
              <p className="mt-0.5 text-[17px] font-semibold text-ink-900">{view.dealer.name}</p>
              {view.dealer.city && <p className="text-small text-muted">{view.dealer.city}</p>}
            </div>
          </div>
          {view.expires && (
            <div className="border-t border-line pt-3">
              <ValidThrough expires={view.expires} />
            </div>
          )}
        </div>
      </div>
      <Retry view={view} label={view.failed?.intent === "notme" ? "That's not me" : "Yes, that's me"} />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <form action={action}>
          <input type="hidden" name="intent" value="confirm" />
          <Primary pending={pending} pendingLabel="One moment…">
            Yes, that&apos;s me
          </Primary>
        </form>
        <form action={action}>
          <input type="hidden" name="intent" value="notme" />
          <button type="submit" disabled={pending} className="btn-secondary w-full px-6 py-3.5 text-[17px]">
            That&apos;s not me
          </button>
        </form>
      </div>
    </div>
  );
}

// ── 3. A few questions (optional, one screen of tap-to-choose rows) ──────

const ROWS: { key: DetailKey; label: string }[] = [
  { key: "bankruptcy", label: "Bankruptcy in the past few years?" },
  { key: "repo", label: "A repossession?" },
  { key: "creditScore", label: "Your credit today" },
  { key: "downPayment", label: "Down payment you're comfortable with" },
  { key: "vehicleType", label: "What you're looking for" },
  { key: "buyTime", label: "When you'd like to drive it" },
  { key: "tradeIn", label: "Do you have a vehicle to trade in?" },
];

function AnswersStep({ view, action, pending }: StepProps<"answers">) {
  const [answers, setAnswers] = useState<Details>(view.answers);
  const set = (k: DetailKey, v: string | undefined) => setAnswers((a) => ({ ...a, [k]: v }));
  const count = ROWS.filter((r) => answers[r.key]).length;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="intent" value="answers" />
      {ROWS.map(({ key }) => (answers[key] ? <input key={key} type="hidden" name={key} value={answers[key]} /> : null))}
      <Title kicker="A few questions" sub="Tap whatever fits — or skip. It takes about ten seconds.">
        {view.firstName ? `A little about your situation, ${view.firstName}` : "A little about your situation"}
      </Title>
      <p className="flex items-start gap-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-small font-medium text-brand-800">
        <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0" />
        <span>Every question is optional, and none of them checks your credit. Your answers help your specialist line up lenders that fit.</span>
      </p>

      <div className="-my-1 divide-y divide-line">
        {ROWS.map(({ key, label }) => (
          <fieldset key={key} className="py-3.5">
            <legend className="float-left mb-2.5 w-full text-small font-semibold text-ink-900">{label}</legend>
            <div className="clear-left flex flex-wrap gap-2">
              {QUESTIONS[key].map((o) => (
                <label key={o.value} className="pill">
                  <input
                    type="radio"
                    name={`pick-${key}`}
                    value={o.value}
                    checked={answers[key] === o.value}
                    onChange={() => set(key, o.value)}
                    onClick={(e) => {
                      // Tap a chosen answer again to clear it (pointer only; keyboard arrows just select).
                      if (e.detail > 0 && answers[key] === o.value) set(key, undefined);
                    }}
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <Retry view={view} label={view.failed?.intent === "answers:skip" ? "Skip" : "Continue"} />
      <div className="grid grid-cols-2 gap-3 border-t border-line pt-5">
        <button type="submit" name="skip" value="all" disabled={pending} className="btn-secondary px-4 py-3.5 text-[17px]">
          Skip
        </button>
        <button type="submit" disabled={pending} className="btn-primary px-4 py-3.5 text-[17px]">
          {pending ? (
            <span>Saving…</span>
          ) : (
            <>
              <span>Continue</span> <Icon name="arrow" className="h-5 w-5 max-[359px]:hidden" />
            </>
          )}
        </button>
      </div>
      <p className="text-center text-caption text-muted" aria-live="polite">
        {count ? `${count} of ${ROWS.length} answered · tap an answer again to clear it` : "Skip sends nothing — that's completely fine."}
      </p>
    </form>
  );
}

// ── 4. Contact ──────────────────────────────────────────────────────────────

const subscribeNoop = () => () => {};

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function ContactStep({ view, action, pending, busy }: StepProps<"contact">) {
  const sending = pending && busy?.intent === "contact";
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [consent, setConsent] = useState(false);
  // Submitting unticked shows why here instead of reaching the server.
  const [consentNeeded, setConsentNeeded] = useState(false);
  const consentRef = useRef<HTMLInputElement>(null);
  const tz = useSyncExternalStore(subscribeNoop, () => new Date().getTimezoneOffset(), () => 0);
  // Hide a field's error once the visitor edits it; a new submit brings fresh errors.
  const [edited, setEdited] = useState<{ for?: object; keys: Set<string> }>({ keys: new Set() });
  if (edited.for !== view.fieldErrors) setEdited({ for: view.fieldErrors, keys: new Set() });
  const touch = (k: string) => !edited.keys.has(k) && setEdited((e) => ({ ...e, keys: new Set(e.keys).add(k) }));
  const fe = Object.fromEntries(Object.entries(view.fieldErrors ?? {}).filter(([k]) => !edited.keys.has(k)));
  const consentError = fe.consent ?? (consentNeeded ? "Please check the box so your specialist can text you." : undefined);
  return (
    <div className="space-y-6">
      <form
        action={action}
        className="space-y-5"
        noValidate
        onSubmit={(e) => {
          if (consent) return;
          e.preventDefault();
          setConsentNeeded(true);
          consentRef.current?.focus();
        }}
      >
        <input type="hidden" name="intent" value="contact" />
        <input type="hidden" name="tz" value={tz} />
        <Title kicker="Contact" sub={`A specialist at ${view.dealer.name} will text you about your application and a time to visit.`}>
          Where should your specialist text you?
        </Title>
        {view.needName && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="firstName" label="First name" error={fe.firstName}>
              <input id="firstName" name="firstName" value={first} onChange={(e) => (setFirst(e.target.value), touch("firstName"))} autoComplete="given-name" className="field" aria-invalid={!!fe.firstName} aria-describedby={fe.firstName ? "firstName-error" : undefined} />
            </Field>
            <Field id="lastName" label="Last name" error={fe.lastName}>
              <input id="lastName" name="lastName" value={last} onChange={(e) => (setLast(e.target.value), touch("lastName"))} autoComplete="family-name" className="field" aria-invalid={!!fe.lastName} aria-describedby={fe.lastName ? "lastName-error" : undefined} />
            </Field>
          </div>
        )}
        <Field
          id="phone"
          label="Mobile number"
          hint="Your specialist will text this number."
          error={fe.phone}
          valid={phone.replace(/\D/g, "").length === 10 && !/^[01]/.test(phone.replace(/\D/g, ""))}
        >
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(555) 555-5555"
            value={phone}
            onChange={(e) => (setPhone(formatPhoneInput(e, phone)), touch("phone"))}
            className="field tabular h-14 text-[1.2rem] font-medium tracking-wide"
            aria-invalid={!!fe.phone}
            aria-describedby={fe.phone ? "phone-error phone-hint" : "phone-hint"}
          />
        </Field>
        <Field id="email" label="Email" optional error={fe.email} valid={EMAIL_OK.test(email.trim())}>
          <input id="email" name="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => (setEmail(e.target.value), touch("email"))} className="field" aria-invalid={!!fe.email} aria-describedby={fe.email ? "email-error" : undefined} />
        </Field>
        <div>
          <label className={`flex gap-3 rounded-lg border p-4 text-[14px] leading-relaxed text-ink-700 ${consentError ? "border-oops-700/30 bg-oops-50" : "border-line bg-canvas"}`}>
            <input
              ref={consentRef}
              type="checkbox"
              name="consent"
              value="yes"
              checked={consent}
              onChange={(e) => (setConsent(e.target.checked), setConsentNeeded(false), touch("consent"))}
              className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
              aria-invalid={!!consentError}
              aria-describedby={consentError ? "consent-error" : undefined}
            />
            <span>
              I agree to receive text messages from {view.dealer.name} about my invitation and credit application at the mobile
              number above, which may be sent using automated technology. Message and data rates may apply; message
              frequency varies. Reply STOP to opt out at any time. Consent isn&apos;t a condition of purchase. I agree to
              the{" "}
              <a className="link" href="/terms" target="_blank">
                Terms
              </a>{" "}
              and{" "}
              <a className="link" href="/privacy" target="_blank">
                Privacy Policy
              </a>
              .
            </span>
          </label>
          <FieldError id="consent-error" error={consentError} />
        </div>
        {view.error && !view.failed && <Alert>{view.error}</Alert>}
        <Retry view={view} label="Continue" />
        <div aria-live="polite" className="sr-only">
          {sending ? `Sending your details securely to ${view.dealer.name}.` : ""}
        </div>
        <Primary pending={pending} working={sending} blocked={!consent} pendingLabel="Sending securely…">
          Continue
        </Primary>
        <div className="space-y-2">
          <p className="flex items-start gap-2 text-small text-ink-700">
            <Icon name="card" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
            <span>Next: your credit application — two fields, about a minute.</span>
          </p>
          <ValidThrough expires={view.expires} />
          <p className="flex items-start gap-2 text-small text-muted">
            <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
            <span>
              {pending
                ? `Sending securely to ${view.dealer.name}…`
                : `Encrypted, and shared only with ${view.dealer.name}. We never sell your information.`}
            </span>
          </p>
        </div>
      </form>
      <form action={action} className="text-center">
        <input type="hidden" name="intent" value="back" />
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap text-small font-medium text-muted transition-colors hover:text-ink-900">
          <Icon name="back" className="h-4 w-4" /> Change my answers
        </button>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  optional,
  error,
  valid = false,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  /** Show a quiet check inside the field once the value looks right. */
  valid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-small font-semibold text-ink-900">
        {label}
        {optional && <span className="text-caption font-normal text-muted">Optional</span>}
      </label>
      <div className="relative">
        {children}
        {valid && !error && (
          <span className="pop-in pointer-events-none absolute right-3.5 top-1/2 -mt-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-600" aria-hidden="true">
            <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 flex items-center gap-1.5 text-[14px] text-muted">
          <Icon name="message" className="h-4 w-4 text-brand-600" /> {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} error={error} />
    </div>
  );
}

function FieldError({ id, error }: { id: string; error?: string }) {
  return (
    <div aria-live="polite">
      {error && (
        <p id={id} className="mt-1.5 flex items-start gap-1.5 text-[14px] font-medium text-oops-700">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

// ── 5. Credit application, then the result ──────────────────────────────────
// The credit application (CreditApplication.tsx) opens the result. Once it's sent or skipped — or when the
// site has no credit application — the result shows: the outcome, visit booking, the confirmation and what's next.

function DoneStep({
  view,
  action,
  pending,
  credit,
  onReopen,
}: StepProps<"done"> & { credit: CreditDone; onReopen: () => void }) {
  const sent = credit === "sent";
  const dealer = view.dealer.name;
  const bring = BRING.flatMap((b) => {
    if (!b.title.startsWith("Trade-in")) return [b];
    if (view.hasTradeIn === "no") return [];
    const note = view.hasTradeIn === "yes"
      ? view.tradeIn ? `For your trade-in — your ${view.tradeIn}, if that's the one.` : "For the vehicle you're trading in."
      : view.tradeIn ? `If you're trading in your ${view.tradeIn}.` : b.note;
    return [{ title: b.title, note }];
  });
  const name = view.firstName ? `, ${view.firstName}` : "";
  return (
    <div className="space-y-8">
      {/* The outcome, then the next step: your specialist, and when you'll meet. */}
      <div className="text-center">
        <SuccessCheck />
        <p className="eyebrow mt-5">{sent ? "Application sent" : "You're all set"}</p>
        <h1
          data-step-heading
          tabIndex={-1}
          className="mt-2.5 font-display text-display-2 text-ink-950 outline-none"
        >
          {sent ? `Your credit application is on its way${name}.` : `You're all set${name}.`}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-body text-muted">
          {sent ? (
            <>
              <strong className="font-semibold text-ink-900">{dealer}</strong> will review it with its lenders, and a
              specialist will text you at{" "}
              <strong className="tabular whitespace-nowrap font-semibold text-ink-900">{view.phone}</strong>.
            </>
          ) : (
            <>
              A specialist at <strong className="font-semibold text-ink-900">{dealer}</strong> will text you at{" "}
              <strong className="tabular whitespace-nowrap font-semibold text-ink-900">{view.phone}</strong>.
            </>
          )}
          {view.booked ? " Your visit is on the calendar." : <span className="print:hidden"> Pick a time to meet below, or set one up by text.</span>}
        </p>
      </div>

      {sent && (
        <p className="settle mx-auto flex max-w-lg items-start gap-2.5 rounded-lg border border-line bg-canvas px-4 py-3 text-small text-ink-700">
          <Icon name="info" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-brand-700" />
          <span>
            Each lender makes its own decision, and not everyone will qualify. Your specialist will walk you through
            the options {dealer} finds for you.
          </span>
        </p>
      )}

      {credit === "skipped" && view.credit === "offer" && (
        <div className="settle flex flex-col items-start gap-3 rounded-xl border border-line bg-canvas p-5 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-ink-900">Your credit application isn&apos;t sent yet.</p>
            <p className="text-small text-muted">Your specialist can take it at your visit, or you can finish it now.</p>
          </div>
          <button type="button" onClick={onReopen} className="btn-secondary h-11 shrink-0 px-4 text-small">
            <span>Finish it now</span> <Icon name="arrow" className="h-4 w-4" />
          </button>
        </div>
      )}

      <Appointment view={view} action={action} pending={pending} />

      {/* The confirmation itself. */}
      <ReservationCard
        className="settle"
        confirmation={<TypeIn text={view.confirmation} delay={450} />}
        confirmationText={view.confirmation}
        dealer={dealer}
        address={view.dealer.address}
        expires={view.expires}
        phone={view.phone}
        credit={view.credit === "off" ? undefined : sent ? "Sent to the dealership" : "Not sent yet"}
      />

      <Reveal as="section" aria-labelledby="next-title">
        <h2 id="next-title" className="font-display text-display-3 text-ink-950">
          What happens next
        </h2>
        <Reveal as="ol" motion="list" className="mt-4 space-y-3.5">
          {[
            `Watch for a text from ${dealer}. Reply whenever it suits you — or reply STOP anytime.`,
            sent
              ? `${dealer} reviews your application with its lenders, so your specialist can talk through real options with you.`
              : view.credit === "off"
                ? "Your specialist will talk through your financing options with you."
                : "Your specialist can take your credit application at your visit.",
            view.booked
              ? `Meet your specialist at ${dealer} on ${view.booked.when}.`
              : "Pick a time to meet your specialist — above, or by text.",
            "Bring the items below, look at vehicles and terms together, and decide — there's no obligation.",
          ].map((t, i) => (
            <li key={i} className="flex gap-3.5 text-ink-800">
              <span data-pop className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-950 text-[12px] font-semibold text-white">
                {i + 1}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </Reveal>
      </Reveal>

      <Reveal as="section" aria-labelledby="bring-title" className="rounded-xl border border-line bg-canvas p-5 sm:p-6">
        <h2 id="bring-title" className="font-display text-display-3 text-ink-950">
          What to bring
        </h2>
        <Reveal as="ul" motion="list" className="mt-2 divide-y divide-line">
          {bring.map((b) => (
            <li key={b.title} className="flex gap-3.5 py-3.5">
              <span data-pop className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-100 bg-paper text-brand-700">
                <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              <span>
                <span className="block font-semibold text-ink-900">{b.title}</span>
                {b.note && <span className="mt-0.5 block text-small text-muted">{b.note}</span>}
              </span>
            </li>
          ))}
        </Reveal>
      </Reveal>

      <div className="grid gap-3 print:hidden sm:grid-cols-2">
        {view.dealer.address ? (
          <a
            href={mapsUrl([dealer, view.dealer.address])}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary px-5 py-3.5 text-[16px]"
          >
            <Icon name="map" className="h-5 w-5" /> <span>Get directions</span>
          </a>
        ) : (
          <Link href="/" className="btn-primary px-5 py-3.5 text-[16px]">
            Back to home
          </Link>
        )}
        <PrintButton />
      </div>
      {view.dealer.phone && view.dealer.phoneHref && (
        <p className="text-center text-small text-muted">
          Dealership phone:{" "}
          <a href={view.dealer.phoneHref} className="link tabular">
            {view.dealer.phone}
          </a>
        </p>
      )}
    </div>
  );
}

/** Reveal a code character by character (screen readers read the parent's aria-label instead). */
function TypeIn({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span aria-hidden="true">
      {Array.from(text).map((ch, i) => (
        <span key={i} className="char-in" style={{ animationDelay: `${delay + i * 32}ms` }}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

// ── Appointment (result step) ───────────────────────────────────────────────

/** "2026-10-04" → { top: "Sat", bottom: "Oct 4" }, or "Today" / "Tomorrow". */
function dayChip(date: string): { top: string; bottom: string } {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const bottom = dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((dt.getTime() - today) / 86400000);
  const top = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  return { top, bottom };
}

const POLL_FAST_MS = 1500;
const POLL_FAST_TRIES = 10; // the first ~15 s, while UpDash turns the response into a lead
const POLL_MS = 5000;
const POLL_TRIES = 43; // ~3 minutes of visible-tab polling

type Phase = "waiting" | "ready" | "gone";

/**
 * Times exist only once UpDash has turned the response into a lead (seconds
 * after submit, or the next cron run at worst), so poll for them: every 1.5 s
 * at first, then every 5 s, ~3 minutes of visible time, paused while hidden.
 */
function useSlots(round: number, refresh: object | null) {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [slots, setSlots] = useState<Slots | null>(null);
  const [seen, setSeen] = useState({ round, refresh });
  // A new wait (lead_not_ready on book) or refresh (time taken) restarts polling.
  if (seen.round !== round || seen.refresh !== refresh) {
    setSeen({ round, refresh });
    if (seen.round !== round) setPhase("waiting");
  }

  useEffect(() => {
    if (phase !== "waiting" && !refresh) return;
    let stopped = false;
    let busy = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (stopped || busy || document.hidden) return;
      busy = true;
      tries += 1;
      const r = await pollSlots().catch(() => ({ status: "waiting" as const }));
      busy = false;
      if (stopped) return;
      if (r.status === "ready") {
        setSlots(r.slots);
        setPhase(r.slots ? "ready" : "gone");
        return;
      }
      if (r.status === "off" || tries >= POLL_TRIES) {
        setPhase("gone");
        return;
      }
      timer = setTimeout(tick, tries < POLL_FAST_TRIES ? POLL_FAST_MS : POLL_MS);
    };
    const onVisible = () => {
      if (document.hidden) return;
      clearTimeout(timer);
      void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // Only (re)start on entering "waiting" or on a refresh request.
  }, [phase === "waiting", round, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  return { phase, slots };
}

function Spinner() {
  return (
    <svg viewBox="0 0 20 20" className="spin h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="none" stroke="var(--color-line-strong)" strokeWidth="2" />
      <path d="M10 2a8 8 0 0 1 8 8" fill="none" stroke="var(--color-brand-600)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Appointment({ view, action, pending }: StepProps<"done">) {
  const { booked, bookError } = view;
  const [round, setRound] = useState(0);
  const [refresh, setRefresh] = useState<object | null>(null);
  const [changing, setChanging] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [day, setDay] = useState<string>(booked?.date ?? "");
  const [time, setTime] = useState<string>(booked?.time ?? "");
  const [seenView, setSeenView] = useState(view);
  // React to each booking result once (a booking that didn't get through changes nothing: it shows a retry alert).
  if (seenView !== view) {
    setSeenView(view);
    if (!view.failed) {
      if (view.bookState === "not_ready") setRound((r) => r + 1);
      if (view.bookState === "taken") setRefresh(view);
      if (view.booked && !view.bookError && !view.bookState) setChanging(false);
    }
  }
  const { phase: polled, slots } = useSlots(round, refresh);
  const phase: Phase = view.bookState === "off" && seenView === view ? "gone" : polled;
  const dealer = view.dealer.name;

  const announce =
    phase === "ready" && !booked
      ? `Visit times at ${dealer} are ready.`
      : phase === "gone" && !booked
        ? "Your specialist will text you to set up a time."
        : "";
  const live = (
    <p className="sr-only" aria-live="polite">
      {announce}
    </p>
  );

  if (booked && !(changing && phase === "ready" && slots)) {
    return (
      <section
        aria-labelledby="appt-title"
        className="fade-up rounded-xl border border-brand-100 bg-brand-50 p-5 sm:p-6"
        aria-live="polite"
      >
        <div className="flex gap-4">
          <span className="pop-in flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Icon name="calendar" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="label text-brand-800">Your visit</p>
            <h2 id="appt-title" className="mt-1 font-display text-display-3 text-ink-950">
              You&apos;re booked for {booked.when}.
            </h2>
            <p className="mt-1 text-small text-ink-700">
              Meet your specialist at {dealer}
              {view.dealer.address ? ` · ${view.dealer.address}` : ""}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 print:hidden sm:pl-[3.75rem]">
          <a href="/invitation/visit.ics" download className="btn-secondary h-11 px-4 text-small">
            <Icon name="download" className="h-4 w-4" /> <span>Add to calendar</span>
          </a>
          {phase === "ready" && slots && (
            <button
              type="button"
              onClick={() => {
                setChanging(true);
                setCollapsed(false);
                setDay(booked.date);
                setTime(booked.time);
              }}
              className="link inline-flex min-h-11 items-center whitespace-nowrap text-small"
            >
              Change time
            </button>
          )}
        </div>
      </section>
    );
  }

  if (phase === "waiting") {
    return (
      <div className="print:hidden">
        {live}
        <div className="shimmer flex items-center gap-3 rounded-lg border border-line bg-canvas px-4 py-3.5 text-small text-muted" role="status">
          <Spinner />
          <span>Setting up your visit options at {dealer}…</span>
        </div>
      </div>
    );
  }

  if (phase === "gone" || !slots) {
    return (
      <div className="print:hidden">
        {live}
        <p className="fade-up flex items-center justify-center gap-2.5 rounded-lg border border-line bg-canvas px-4 py-3.5 text-center text-small text-muted">
          <Icon name="message" className="h-4 w-4 shrink-0 text-brand-600" />
          Your specialist will text you to set up a time.
        </p>
      </div>
    );
  }

  if (collapsed) {
    return (
      <p
        className="fade-up flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-lg border border-line bg-canvas px-4 py-3 text-center text-small text-muted print:hidden"
        aria-live="polite"
      >
        <span>No problem — your specialist will text you to find a time.</span>
        <button type="button" onClick={() => setCollapsed(false)} className="link inline-flex min-h-11 items-center whitespace-nowrap">
          Pick a time instead
        </button>
      </p>
    );
  }

  const current = slots.days.find((d) => d.date === day) ?? slots.days[0];
  const chosenTime = current.times.includes(time) ? time : "";

  return (
    <section aria-labelledby="appt-title" className="card fade-up scroll-mt-24 overflow-hidden print:hidden">
      {live}
      <div className="flex items-start gap-4 border-b border-line bg-canvas px-5 py-4 sm:px-6">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-paper text-brand-700">
          <Icon name="calendar" className="h-5 w-5" />
        </span>
        <div>
          <h2 id="appt-title" className="font-display text-display-3 text-ink-950">
            Pick a time to meet your specialist at {dealer}
          </h2>
          <p className="mt-0.5 text-small text-muted">Optional. Times are the dealership&apos;s local time.</p>
        </div>
      </div>
      <form action={action} className="space-y-5 p-5 sm:p-6">
        <input type="hidden" name="intent" value="book" />
        <input type="hidden" name="zone" value={slots.timeZone} />
        <fieldset>
          <legend className="mb-2.5 text-[14px] font-semibold text-ink-900">Day</legend>
          <div className="-mx-1 -my-1 flex snap-x gap-2 overflow-x-auto px-1 py-1.5 sm:mx-0 sm:my-0 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(4.6rem,1fr))] sm:overflow-visible sm:px-0">
            {slots.days.map((d, i) => {
              const c = dayChip(d.date);
              return (
                <label key={d.date} className="pill slot fade-up shrink-0 snap-start" style={{ animationDelay: `${i * 35}ms` }}>
                  <input
                    type="radio"
                    name="date"
                    value={d.date}
                    checked={current.date === d.date}
                    onChange={() => {
                      setDay(d.date);
                      setTime("");
                    }}
                    aria-label={d.label}
                  />
                  <span className="min-w-[4.6rem] flex-col !gap-0">
                    {c.top}
                    <small className="text-[12px] font-medium opacity-80">{c.bottom}</small>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <fieldset key={current.date}>
          <legend className="mb-2.5 text-[14px] font-semibold text-ink-900">
            Time · {current.label}
            {current.open && current.close && (
              <span className="block text-caption font-normal text-muted sm:ml-2 sm:inline">
                Open {current.open} – {current.close}
              </span>
            )}
          </legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {current.times.map((t, i) => (
              <label key={t} className="pill slot fade-up" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                <input type="radio" name="time" value={t} checked={chosenTime === t} onChange={() => setTime(t)} />
                <span className="tabular w-full justify-center">{t}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div aria-live="polite">
          {view.failed?.intent === "book" ? (
            <Alert key={view.failed.at}>{bookRetryMessage("Book this time")}</Alert>
          ) : (
            bookError && <Alert>{bookError}</Alert>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={pending || !chosenTime}
            className={`btn-primary px-6 py-3 text-[16px] disabled:cursor-not-allowed ${pending ? "shimmer shimmer-dark" : ""}`}
          >
            {pending ? "Booking…" : "Book this time"}
          </button>
          <button
            type="button"
            onClick={() => (booked ? setChanging(false) : setCollapsed(true))}
            className="btn-secondary px-5 py-3 text-small"
          >
            {booked ? "Keep my current time" : "I'll stop by instead"}
          </button>
        </div>
      </form>
    </section>
  );
}

function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary px-5 py-3.5 text-[16px]">
      <Icon name="doc" className="h-5 w-5" /> <span>Print or save this page</span>
    </button>
  );
}

/** A calm success mark: a pale blue disc behind a ring and tick that draw in once (static under reduced motion). */
function SuccessCheck() {
  return (
    <div className="relative mx-auto h-[72px] w-[72px]" aria-hidden="true">
      <svg viewBox="0 0 56 56" className="relative h-full w-full">
        <circle cx="28" cy="28" r="27" fill="var(--color-brand-50)" />
        <circle className="draw-ring" cx="28" cy="28" r="24" fill="none" stroke="var(--color-brand-600)" strokeWidth="2" strokeLinecap="round" transform="rotate(-90 28 28)" />
        <path className="draw-tick" d="M18.5 28.5l6.5 6.5 12.5-13" fill="none" stroke="var(--color-brand-600)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
