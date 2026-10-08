import { Mark } from "./Mark";

/** Where the Invitation Code is on the mailer: by the barcode, sometimes labeled "PIN". */
export function CodeHelp({ id }: { id: string }) {
  const bars = [0, 4, 6, 11, 14, 16, 21, 23, 27, 30, 34, 36, 41, 44, 46, 50, 55, 57, 61, 64, 68, 70, 75, 78, 81, 85, 88, 92, 95, 99, 102, 106];
  return (
    <div id={id} className="fade-up mt-2 rounded-lg border border-line bg-canvas p-4 sm:p-5">
      <svg
        viewBox="0 0 360 150"
        className="w-full max-w-md"
        role="img"
        aria-label="Your mailer. The Invitation Code is the 9-digit number printed under the barcode, sometimes labeled PIN."
        fill="none"
      >
        <rect x="4.5" y="4.5" width="351" height="141" rx="6" fill="var(--color-paper)" stroke="var(--color-line-strong)" />
        {/* the mark and return address */}
        <Mark x={16} y={16} size={20} shield="var(--color-ink-950)" check="var(--color-accent-600)" halo="var(--color-paper)" />
        <rect x="42" y="20" width="60" height="5" rx="2.5" fill="var(--color-ink-800)" />
        <rect x="42" y="30" width="44" height="4" rx="2" fill="var(--color-line-strong)" />
        {/* the stamp */}
        <rect x="302.5" y="16.5" width="40" height="32" rx="3" stroke="var(--color-line-strong)" strokeDasharray="3 3" />
        {/* recipient */}
        <rect x="40" y="72" width="110" height="6" rx="3" fill="var(--color-ink-700)" />
        <rect x="40" y="85" width="140" height="5" rx="2.5" fill="var(--color-line-strong)" />
        <rect x="40" y="97" width="96" height="5" rx="2.5" fill="var(--color-line-strong)" />
        {/* barcode */}
        <g fill="var(--color-ink-950)">
          {bars.map((x, i) => (
            <rect key={x} x={210 + x} y="70" width={i % 3 === 0 ? 2.6 : 1.4} height="30" />
          ))}
        </g>
        <text x="263" y="118" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="12.5" fontWeight="700" fill="var(--color-ink-950)">
          PIN# 123-456-789
        </text>
        {/* highlight */}
        <rect x="200.5" y="103.5" width="125" height="21" rx="4" stroke="var(--color-brand-600)" strokeWidth="1.5" />
      </svg>
      <p className="mt-3 text-small text-ink-700">
        Look on the front of your mailer for the <strong>9-digit number by the barcode</strong> — it&apos;s sometimes
        labeled <strong>PIN</strong>. That number is your Invitation Code. Scanning the QR code with your phone camera
        fills it in for you.
      </p>
    </div>
  );
}
