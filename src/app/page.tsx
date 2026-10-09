import type { CSSProperties } from "react";
import Image from "next/image";
import { Footer, Header } from "@/components/Chrome";
import { CodeForm } from "@/components/CodeForm";
import { Parallax, Reveal } from "@/components/Motion";
import { StickyCta } from "@/components/StickyCta";
import { Icon, type IconName } from "@/components/Icon";
import { LogoMark } from "@/components/Logo";
import { BRING } from "@/lib/bring";
import { site } from "@/lib/site";
import hero from "@/images/hero.jpg";

/* The home page has one job: get the Invitation Code entered. Every section
 * below the fold removes one doubt, in the order people raise them. */

const HERO_ALT = "A smiling woman in the driver's seat of a new car at a dealership, holding up the key.";

const FACTS = ["About 3 minutes", "Name and address already filled in", "A specialist texts you"];

const STEPS: { title: string; body: string }[] = [
  {
    title: "Enter your Invitation Code",
    body: "It's the 9-digit number by the barcode on your mailer. We find your invitation and the dealership that sent it.",
  },
  {
    title: "Confirm it's you",
    body: "You'll see your name and part of your address. A few optional questions about your situation help your specialist line up lenders.",
  },
  {
    title: "Tell us where to text you",
    body: "Leave your mobile number, and email if you like. A specialist at the dealership will text you. Nothing up to here checks your credit.",
  },
  {
    title: "Finish your credit application",
    body: "A few more details and your OK, then it goes securely to the dealership, which reviews it with its lenders before you visit.",
  },
];

const NEED: { icon: IconName; title: string; body: string }[] = [
  { icon: "doc", title: "Your mailer", body: "For the 9-digit Invitation Code printed by the barcode." },
  { icon: "phone", title: "Your mobile phone", body: "Your specialist texts you there about your application and a time to visit." },
  {
    icon: "shield",
    title: "Your OK for a credit check",
    body: "The credit application is a hard inquiry, so we ask before anything is sent. You can also apply at your visit instead.",
  },
];

const FAQ = [
  {
    q: "Is this a real invitation?",
    a: "Yes. Your mailer came from the dealership named on it, and your Invitation Code is tied to that mailing — enter it and you'll see your own name and part of your address before anything else happens. Nothing is bought or signed on this site.",
  },
  {
    q: "Will this affect my credit score?",
    a: "Entering your Invitation Code and contact details doesn't check your credit. The credit application does: when you send it, you authorize the dealership and the lenders it works with to obtain your credit report. That's a hard inquiry, which may affect your credit score. You'll be asked for your permission first, and you can skip it and let your specialist take your application at your visit instead.",
  },
  {
    q: "How is my information protected?",
    a: "Your application is sent over an encrypted connection to the dealership and the lenders it submits your application to. It's used for nothing else, and never sold.",
  },
  {
    q: "Will I be approved?",
    a: "No one can promise that. Each lender makes its own decision based on your full application, and not everyone will qualify. Your specialist will walk you through whatever options the dealership finds for you.",
  },
  {
    q: "How will the dealership reach me?",
    a: "By text. Your specialist texts you at the mobile number you give, about your invitation and your application. Reply whenever it suits you, or reply STOP to end the texts. You're never obligated to buy.",
  },
  {
    q: "Why do you ask about my credit and down payment?",
    a: "Those questions are optional, and you can skip any of them. Your answers help your specialist match you with lenders that fit your situation. Answering them doesn't check your credit.",
  },
  {
    q: "Where do I find my Invitation Code?",
    a: "It's the 9-digit number printed under the barcode on the invitation your dealership mailed you. Scanning the QR code with your phone's camera opens this site with your Invitation Code already filled in.",
  },
  {
    q: "Does it cost anything?",
    a: "No. There's no charge to use this site or to talk with the dealership's specialist, and you're never obligated to buy.",
  },
  {
    q: `Is ${site.name} a lender?`,
    a: "No. It connects you with a participating local dealership. Financing comes from third-party lenders through the dealership, and their terms depend on your full credit application.",
  },
];

const at = (i: number) => ({ "--i": i }) as CSSProperties;

export default function Home() {
  return (
    <>
      <Header cta={false} />
      <main id="main">
        {/* Hero: the code field is the centre; one photograph beside it (a band under the copy on phones). */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-[70rem] gap-x-10 px-5 pb-0 pt-8 sm:px-8 sm:pb-20 sm:pt-14 lg:grid-cols-12 lg:items-center lg:pb-24 lg:pt-16">
            <div id="start" className="scroll-mt-24 lg:col-span-7">
              <p className="eyebrow rise flex items-center gap-2" style={at(1)}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600" aria-hidden="true" />
                By invitation only
              </p>
              <h1 className="rise mt-4 font-display text-display-1 text-ink-950" style={at(2)}>
                Your auto credit application, <span className="whitespace-nowrap text-brand-600">already started.</span>
              </h1>
              <p className="rise measure mt-5 text-body text-muted sm:text-lede" style={at(3)}>
                Enter the Invitation Code from your mailer. Your name and address are already filled in — confirm it&apos;s
                you, tell us where to text you, and send your credit application to the dealership in a few minutes.
              </p>
              <div className="rise mt-7 max-w-xl text-left" style={at(4)}>
                <CodeForm lift />
              </div>
              <ul className="rise mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-small font-medium text-ink-700" style={at(5)}>
                {FACTS.map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Icon name="check" className="h-4 w-4 shrink-0 text-brand-600" strokeWidth={2.5} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            {/* Phones: a full-bleed band. From sm: a rounded photo on a blue offset frame, with a chip over its edge. */}
            <Parallax className="-mx-5 mt-12 sm:mx-0 lg:col-span-5 lg:mt-0">
              <figure className="rise relative mx-auto sm:max-w-[34rem] sm:pb-4 sm:pr-4 lg:max-w-none" style={at(3)}>
                <span
                  className="absolute inset-0 left-4 top-4 hidden rounded-[1.75rem] border-2 border-brand-600 sm:block"
                  aria-hidden="true"
                />
                <Image
                  src={hero}
                  alt={HERO_ALT}
                  sizes="(min-width: 1024px) 26rem, (min-width: 640px) 34rem, 100vw"
                  className="relative aspect-[16/10] w-full object-cover object-[58%_40%] sm:aspect-[4/3] sm:rounded-[1.75rem] sm:shadow-[0_2px_4px_rgba(22,24,29,0.08),0_32px_64px_-28px_rgba(22,24,29,0.5)] lg:aspect-[4/5] lg:object-[64%_45%]"
                  preload
                  placeholder="blur"
                />
                <figcaption className="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-xl border border-line bg-paper px-4 py-3 text-ink-900 shadow-[0_16px_32px_-18px_rgba(22,24,29,0.45)] sm:bottom-0 sm:-left-5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Icon name="lock" className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </span>
                  <span className="text-[14px] font-semibold">Sent securely to your dealership</span>
                </figcaption>
              </figure>
            </Parallax>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="rule scroll-mt-16 bg-paper">
          <Reveal className="mx-auto grid max-w-[70rem] gap-x-8 gap-y-10 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="eyebrow eyebrow-rule">How it works</p>
              <h2 className="mt-3 font-display text-display-2 text-ink-950">Four short steps. Your name and address are already in.</h2>
              <p className="mt-4 text-body text-muted">About three minutes, start to finish.</p>
            </div>
            <Reveal as="ol" motion="list" className="lg:col-span-7 lg:col-start-6">
              {STEPS.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[3rem_1fr] gap-x-4 border-b border-line py-7 first:pt-0 sm:grid-cols-[4rem_1fr] sm:gap-x-6">
                  <span
                    data-pop
                    className={`tabular flex h-10 w-10 items-center justify-center rounded-full font-display text-[1.05rem] font-bold sm:h-12 sm:w-12 sm:text-[1.2rem] ${
                      i === STEPS.length - 1 ? "bg-brand-600 text-white" : "bg-ink-950 text-white"
                    }`}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div className="pt-1.5 sm:pt-2.5">
                    <h3 className="font-display text-display-3 text-ink-950">{s.title}</h3>
                    <p className="measure mt-2 text-body text-muted">{s.body}</p>
                  </div>
                </li>
              ))}
            </Reveal>
          </Reveal>
        </section>

        {/* What you'll need */}
        <section id="need" className="rule scroll-mt-16 overflow-x-clip">
          <Reveal className="mx-auto grid max-w-[70rem] gap-x-8 gap-y-10 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="eyebrow eyebrow-rule">What you&apos;ll need</p>
              <h2 className="mt-3 font-display text-display-2 text-ink-950">Three things, and a couple of minutes.</h2>
              <p className="mt-4 text-body text-muted">
                Applying before you visit lets your specialist look at options with lenders ahead of time, so your visit
                can start with real options. Each lender decides on its own, and not everyone will qualify.
              </p>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <Reveal as="ul" motion="list" className="grid gap-3">
                {NEED.map((n) => (
                  <li key={n.title} className="card flex items-start gap-4 p-5">
                    <span data-pop className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                      <Icon name={n.icon} className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-semibold text-ink-900">{n.title}</span>
                      <span className="mt-1 block text-small text-muted">{n.body}</span>
                    </span>
                  </li>
                ))}
              </Reveal>
              <Reveal as="ul" motion="list" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-small font-medium text-ink-700">
                {["Encrypted in transit", "Shared only with the dealership and its lenders", "Never sold"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Icon name="lock" className="h-4 w-4 text-brand-700" />
                    {t}
                  </li>
                ))}
              </Reveal>
            </div>
          </Reveal>
        </section>

        {/* What to bring */}
        <section id="bring" className="rule scroll-mt-16 bg-paper">
          <Reveal className="mx-auto grid max-w-[70rem] gap-x-8 gap-y-10 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="eyebrow eyebrow-rule">What to bring</p>
              <h2 className="mt-3 font-display text-display-2 text-ink-950">For your visit to the dealership.</h2>
              <p className="mt-4 text-body text-muted">
                Missing one? Bring what you have — your specialist will tell you what else would help.
              </p>
            </div>
            <Reveal as="ol" motion="list" className="lg:col-span-7 lg:col-start-6">
              {BRING.map((b) => (
                <li key={b.title} className="grid grid-cols-[2.25rem_1fr] gap-x-3 border-b border-line py-4 first:pt-0">
                  <span data-pop className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-brand-100 bg-brand-50 text-brand-700" aria-hidden="true">
                    <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                  <div>
                    <p className="font-semibold text-ink-900">{b.title}</p>
                    {b.note && <p className="text-small text-muted">{b.note}</p>}
                  </div>
                </li>
              ))}
            </Reveal>
          </Reveal>
        </section>

        {/* Questions */}
        <section id="faq" className="rule scroll-mt-16">
          <Reveal className="mx-auto grid max-w-[70rem] gap-x-8 gap-y-10 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="eyebrow eyebrow-rule">Questions</p>
              <h2 className="mt-3 font-display text-display-2 text-ink-950">Straight answers before you start.</h2>
              <p className="mt-4 text-body text-muted">Anything else? The dealership named on your mailer is happy to help.</p>
            </div>
            <Reveal motion="list" className="border-t border-line lg:col-span-7 lg:col-start-6">
              {FAQ.map((f) => (
                <details key={f.q} className="faq group border-b border-line">
                  <summary className="flex cursor-pointer items-center justify-between gap-6 py-4 text-[17px] font-semibold text-ink-900 sm:py-5">
                    {f.q}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-700 transition-transform duration-300 group-open:rotate-45">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </span>
                  </summary>
                  <p className="measure pb-5 text-body text-muted">{f.a}</p>
                </details>
              ))}
            </Reveal>
          </Reveal>
        </section>

        {/* Closing: the code field again, on a tinted band */}
        <Reveal as="section" motion="close" className="rule">
          <div className="mx-auto max-w-[70rem] px-5 py-20 sm:px-8 md:py-28">
            <LogoMark className="h-12 w-12" halo="var(--color-brand-50)" />
            <h2 className="mt-6 max-w-[20ch] font-display text-display-1 text-ink-950">Ready when you are.</h2>
            <p className="measure mt-5 text-body text-muted sm:text-lede">
              Your invitation is good through the date printed on your mailer. Enter your Invitation Code to finish your
              credit application with the dealership.
            </p>
            <div className="mt-8 max-w-xl pb-16 md:pb-0">
              <CodeForm idPrefix="again" />
            </div>
          </div>
        </Reveal>
      </main>
      <Footer />
      <StickyCta watch="code,again-code" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </>
  );
}
