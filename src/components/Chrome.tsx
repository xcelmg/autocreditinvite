import Link from "next/link";
import { Logo } from "./Logo";
import { site } from "@/lib/site";

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#need", label: "What you'll need" },
  { href: "/#bring", label: "What to bring" },
  { href: "/#faq", label: "Questions" },
];

export function Header({ cta = true }: { cta?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-sm print:hidden">
      <div className="mx-auto flex h-16 max-w-[70rem] items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" aria-label={`${site.name} home`} className="rounded-lg">
          <Logo />
        </Link>
        {cta ? (
          <Link href="/#start" className="btn-primary px-4 py-2 text-small">
            <span className="sm:hidden">Enter code</span>
            <span className="hidden sm:inline">Enter my Invitation Code</span>
          </Link>
        ) : (
          <nav aria-label="Main" className="hidden items-center gap-7 text-small font-medium text-ink-700 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="inline-flex min-h-11 items-center transition-colors hover:text-ink-950">
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

export function DemoBanner() {
  return (
    <div className="border-b border-accent-100 bg-accent-50 px-4 py-2 text-center text-caption font-medium text-accent-900 print:hidden">
      Demo mode — not connected to UpDash yet. Try Invitation Code <span className="font-mono font-semibold">123-456-789</span>.
      Nothing is saved.
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-paper text-ink-700 print:hidden">
      <div className="mx-auto max-w-[70rem] px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-small text-muted">
              Your invitation to apply for auto financing with a participating local dealership — your name and address
              already filled in.
            </p>
          </div>
          <nav className="flex gap-12 text-small" aria-label="Footer">
            <ul className="space-y-0">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link className="inline-flex min-h-11 items-center hover:text-ink-950" href={n.href}>
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="space-y-0">
              <li><Link className="inline-flex min-h-11 items-center hover:text-ink-950" href="/#start">Enter my Invitation Code</Link></li>
              <li><Link className="inline-flex min-h-11 items-center hover:text-ink-950" href="/privacy">Privacy</Link></li>
              <li><Link className="inline-flex min-h-11 items-center hover:text-ink-950" href="/terms">Terms</Link></li>
            </ul>
          </nav>
        </div>
        <p className="mt-10 max-w-[90ch] border-t border-line pt-6 text-caption text-muted">
          {site.name} connects people with a participating local dealership. It is not a lender, does not make credit
          decisions, and does not arrange or broker loans. Financing is provided by third-party lenders through the
          dealership; approval, rates, down payment and terms depend on your full credit application and each
          lender&apos;s criteria, and not everyone will qualify. Entering your Invitation Code and contact details does
          not check your credit. Submitting the credit application authorizes the dealership and its lenders to obtain
          your credit report — a hard inquiry, which may affect your credit score. © {new Date().getFullYear()}{" "}
          {site.name}.
        </p>
      </div>
    </footer>
  );
}
