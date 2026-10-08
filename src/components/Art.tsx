import { Mark } from "./Mark";
import { Icon } from "./Icon";

/*
 * The hero's one object: the application as a charcoal panel, drawn in real
 * type rather than a picture. It shows the visitor what the site does — most
 * of the application is already filled in from the mailer, and the credit
 * application is the one part left. Decorative (aria-hidden): the hero copy
 * says the same in words.
 */

const ROWS: { title: string; note: string; mono?: boolean; open?: boolean }[] = [
  { title: "Invitation Code", note: "123-456-789", mono: true },
  { title: "Name and address", note: "Already on file from your mailer" },
  { title: "Mobile number", note: "Your specialist texts you" },
  { title: "Credit application", note: "SSN and date of birth · about a minute", open: true },
];

export function HeroPanel({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <div className="rounded-[1.25rem] bg-ink-950 p-5 pb-12 text-white shadow-[0_2px_4px_rgba(22,24,29,0.08),0_32px_64px_-28px_rgba(22,24,29,0.55)] sm:p-7 sm:pb-14">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2.5">
            <Mark className="h-8 w-8" shield="#ffffff" check="var(--color-accent-600)" halo="var(--color-ink-950)" />
            <span className="font-display text-[1.05rem] font-semibold tracking-[-0.02em]">Your application</span>
          </span>
          <span className="rounded-md border border-white/25 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
            Example
          </span>
        </div>
        <ol className="mt-6 space-y-2.5">
          {ROWS.map((r) => (
            <li
              key={r.title}
              className={`flex items-center gap-3.5 rounded-xl px-4 py-3.5 ${
                r.open ? "bg-brand-600 shadow-[0_12px_28px_-14px_rgba(29,90,214,0.9)]" : "bg-white/[0.06]"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  r.open ? "bg-white text-brand-700" : "bg-white/12 text-white"
                }`}
              >
                {r.open ? <Icon name="card" className="h-4 w-4" strokeWidth={2} /> : <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.75} />}
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold leading-tight">{r.title}</span>
                <span className={`mt-0.5 block text-[13.5px] leading-snug ${r.open ? "text-white/90" : "text-white/70"} ${r.mono ? "font-mono tracking-[0.06em]" : ""}`}>
                  {r.note}
                </span>
              </span>
              {r.open && <Icon name="arrow" className="ml-auto h-5 w-5 shrink-0" />}
            </li>
          ))}
        </ol>
        <div className="mt-6 flex items-center gap-3">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
            <span className="block h-full w-3/4 rounded-full bg-white/85" />
          </span>
          <span className="text-[13px] font-medium text-white/75">3 of 4</span>
        </div>
      </div>
      <div className="absolute -bottom-5 left-5 flex items-center gap-2.5 rounded-xl border border-line bg-paper px-4 py-3 text-ink-900 shadow-[0_16px_32px_-18px_rgba(22,24,29,0.45)] sm:-left-6">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
          <Icon name="lock" className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
        <span className="text-[14px] font-semibold">Sent securely to your dealership</span>
      </div>
    </div>
  );
}
