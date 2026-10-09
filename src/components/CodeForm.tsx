"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { heroCodeAction, type HeroResult } from "@/app/invitation/actions";
import { retryMessage } from "@/lib/retry";
import { Checking, MIN_CHECK_MS, wait } from "./Checking";
import { formatPin } from "@/lib/format";
import { CodeHelp } from "./CodeHelp";
import { Icon } from "./Icon";

/**
 * Home-page Invitation Code box. Looks the code up while the verification
 * sequence plays (at least ~900 ms on success, never longer than the request
 * on failure), then continues in /invitation at "Is this you?".
 * The hero instance owns the plain ids (`code`); the closing one takes a prefix.
 */
export function CodeForm({ idPrefix = "", lift = false }: { idPrefix?: string; lift?: boolean }) {
  const id = (s: string) => (idPrefix ? `${idPrefix}-${s}` : s);
  const router = useRouter();
  const [dealer, setDealer] = useState<string | null>(null);
  const [state, action, pending] = useActionState<HeroResult, FormData>(async (prev, fd) => {
    const started = Date.now();
    // A lookup that never got an answer (no signal, a timeout) keeps the code and offers a retry.
    const r = await heroCodeAction(prev, fd).catch((): HeroResult => ({ error: retryMessage("Find my invitation") }));
    if (!r.ok) return r;
    // Updates after an await render right away, so the last line can name the dealership.
    setDealer(r.dealer ?? null);
    await wait(MIN_CHECK_MS - (Date.now() - started));
    router.push("/invitation");
    return r;
  }, {});
  const [code, setCode] = useState("");
  const [help, setHelp] = useState(false);
  // Hide the error once the visitor edits the code; a new submit brings a fresh one.
  const [editedFor, setEditedFor] = useState<object | null>(null);
  const error = editedFor === state ? undefined : state.error;
  const checking = pending || state.ok === true;

  return (
    <div className={`card relative p-5 sm:p-6 ${lift ? "card-lift" : ""}`}>
      <form
        action={(fd) => {
          setDealer(null);
          action(fd);
        }}
        noValidate
      >
        <label htmlFor={id("code")} className="block text-[17px] font-semibold text-ink-900">
          Your Invitation Code
        </label>
        <p id={id("code-hint")} className="mt-0.5 text-small text-muted">
          The 9-digit number by the barcode on your mailer.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            id={id("code")}
            name="code"
            value={code}
            onChange={(e) => {
              setCode(formatPin(e.target.value));
              setEditedFor(state);
            }}
            inputMode="numeric"
            autoComplete="off"
            placeholder="123-456-789"
            maxLength={11}
            readOnly={checking}
            aria-invalid={!!error}
            aria-describedby={error ? `${id("code-error")} ${id("code-hint")}` : id("code-hint")}
            className="field code-field h-14 flex-[999_1_14rem] sm:text-left"
          />
          <button type="submit" disabled={checking} className="btn-primary h-14 flex-[1_0_auto] px-6 text-[17px]">
            {checking ? "Checking…" : "Find my invitation"}
          </button>
        </div>
        {checking && <Checking dealer={dealer} className="mt-3" />}
        <div aria-live="polite">
          {error && !checking && (
            <p id={id("code-error")} className="fade-up mt-3 flex items-start gap-2.5 rounded-lg border border-oops-700/25 bg-oops-50 px-4 py-3 text-small font-medium text-oops-700">
              <Icon name="alert" className="mt-px h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              <span>{error}</span>
            </p>
          )}
        </div>
      </form>
      <button
        type="button"
        onClick={() => setHelp((h) => !h)}
        aria-expanded={help}
        aria-controls={id("code-help")}
        className="link mt-2 inline-flex min-h-11 items-center whitespace-nowrap text-small"
      >
        Where&apos;s my Invitation Code?
      </button>
      {help && <CodeHelp id={id("code-help")} />}
    </div>
  );
}
