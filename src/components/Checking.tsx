"use client";

import { useEffect, useState } from "react";

/*
 * The Invitation Code check, shown while the real lookup runs. Three lines
 * tick in turn — the code, the mailing it belongs to, the dealership — and the
 * last resolves to the dealership's name once the lookup returns it. The
 * caller keeps it on screen for at least ~900 ms (never longer than the
 * request needs) and swaps it for the error state the moment a lookup fails.
 * Screen readers get one polite status line instead of the animation.
 */

const LINE_AT = [280, 560, 760]; // ms after mount when each line may resolve

export function Checking({ dealer, className = "" }: { dealer: string | null; className?: string }) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timers = LINE_AT.map((ms, i) => setTimeout(() => setStage(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, []);

  const lines = [
    { label: "Checking your Invitation Code", done: stage >= 1 },
    { label: "Matching your mailing", done: stage >= 2 },
    {
      label: dealer && stage >= 3 ? dealer : "Locating your participating dealership",
      done: !!dealer && stage >= 3,
    },
  ];

  return (
    <div className={`fade-up rounded-xl border border-line bg-canvas px-4 py-3.5 ${className}`}>
      <p className="sr-only" role="status" aria-live="polite">
        {dealer ? `Found your invitation from ${dealer}.` : "Checking your Invitation Code…"}
      </p>
      <ul className="space-y-2.5" aria-hidden="true">
        {lines.map((l, i) => {
          const active = !l.done && (i === 0 || lines[i - 1].done);
          return (
            <li
              key={i}
              className={`flex items-center gap-3 text-[15px] transition-colors duration-300 ${
                l.done ? "text-ink-900" : active ? "text-ink-700" : "text-subtle"
              }`}
            >
              <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                {l.done ? (
                  <span key="done" className="pop-in flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                ) : active ? (
                  <svg key="spin" viewBox="0 0 20 20" className="spin h-5 w-5">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="var(--color-line-strong)" strokeWidth="2" />
                    <path d="M10 2a8 8 0 0 1 8 8" fill="none" stroke="var(--color-brand-600)" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-line-strong" />
                )}
              </span>
              <span key={l.label} className={i === 2 && l.done ? "fade-up font-semibold" : undefined}>
                {i === 2 && l.done ? `Located ${l.label}` : l.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Resolve after `ms`. */
export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, Math.max(0, ms)));

/** Minimum time the check stays on screen, so it reads as deliberate. */
export const MIN_CHECK_MS = 900;
