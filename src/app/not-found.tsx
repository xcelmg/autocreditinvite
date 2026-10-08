import Link from "next/link";
import { Footer, Header } from "@/components/Chrome";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="flex flex-1 flex-col justify-center px-5 py-24 sm:px-8">
        <div className="mx-auto w-full max-w-xl">
          <LogoMark className="h-14 w-14" />
          <p className="eyebrow mt-8">Page not found</p>
          <h1 className="mt-3 font-display text-display-2 text-ink-950">We couldn&apos;t find that page.</h1>
          <p className="measure mt-4 text-lede text-muted">
            Have your mailer handy? Enter your Invitation Code and we&apos;ll get you back on track.
          </p>
          <Link href="/#start" className="btn-primary mt-8 px-6 py-3.5 text-[17px]">
            Enter my Invitation Code
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
