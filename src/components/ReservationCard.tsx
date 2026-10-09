import type { ReactNode } from "react";
import { Mark } from "./Mark";

/*
 * The confirmation: what the visitor keeps. A white card with a charcoal header
 * band carrying the confirmation number, then the dealership, the
 * valid-through date, the number the specialist will text and, where the site
 * takes credit applications, whether it was sent. It prints on its own.
 */
export function ReservationCard({
  confirmation,
  confirmationText,
  dealer,
  address,
  expires,
  phone,
  credit,
  className = "",
}: {
  confirmation: ReactNode;
  /** Plain text for assistive tech when `confirmation` is animated. */
  confirmationText?: string;
  dealer: string;
  address?: string | null;
  expires?: string | null;
  phone: string;
  /** The credit application's status line, when the site takes one. */
  credit?: string;
  className?: string;
}) {
  return (
    <div className={`card relative overflow-hidden print:border-ink-900 ${className}`}>
      <div className="relative flex items-center justify-between gap-4 bg-ink-950 px-5 py-5 text-white sm:px-6 print:bg-white print:text-ink-950">
        <div className="min-w-0">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-white/75 print:text-ink-700">
            Confirmation number
          </p>
          <p
            className="tabular mt-1 whitespace-nowrap font-mono text-[1.3rem] font-semibold tracking-[0.04em] sm:text-[1.6rem]"
            aria-label={confirmationText}
          >
            {confirmation}
          </p>
        </div>
        <Mark className="h-10 w-10 shrink-0" shield="#ffffff" check="var(--color-accent-500)" halo="var(--color-ink-950)" />
      </div>
      <dl className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
        <div className="sm:col-span-2">
          <dt className="label">Dealership</dt>
          <dd className="mt-1 text-[17px] font-semibold text-ink-900">{dealer}</dd>
          {address && <dd className="text-small text-muted">{address}</dd>}
        </div>
        {expires && (
          <div>
            <dt className="label">Valid through</dt>
            <dd className="mt-1 text-[17px] font-semibold text-ink-900">{expires}</dd>
          </div>
        )}
        <div>
          <dt className="label">We&apos;ll text</dt>
          <dd className="tabular mt-1 whitespace-nowrap text-[17px] font-semibold text-ink-900">{phone}</dd>
        </div>
        {credit && (
          <div className="sm:col-span-2">
            <dt className="label">Credit application</dt>
            <dd className="mt-1 text-[17px] font-semibold text-ink-900">{credit}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
