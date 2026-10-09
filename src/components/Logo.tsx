import { Mark } from "./Mark";

/*
 * The My Auto Credit lockup: the shield-and-check mark, then the wordmark set
 * in Sora — "my" small, "Auto" in charcoal, "Credit" in blue. One component
 * draws the header, the footer and the 404.
 */

export function LogoMark({ className = "h-8 w-8", halo = "var(--color-paper)" }: { className?: string; halo?: string }) {
  return <Mark className={className} shield="var(--color-ink-950)" check="var(--color-accent-600)" halo={halo} />;
}

export function Logo({ className = "", halo }: { className?: string; halo?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <LogoMark className="h-8 w-8 shrink-0" halo={halo} />
      <span className="font-display text-[1.3rem] font-bold leading-none tracking-[-0.03em]">
        <span className="mr-[0.12em] align-[0.04em] text-[0.62em] font-semibold tracking-[-0.01em] text-ink-700">my</span>
        <span className="text-ink-950">Auto</span>
        <span className="text-brand-600">Credit</span>
      </span>
    </span>
  );
}
