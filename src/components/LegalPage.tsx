import { Footer, Header } from "./Chrome";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="flex-1">
        <article className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-display-3 [&_h2]:text-ink-950 [&_li]:mt-1.5 [&_p]:mt-4 [&_p]:leading-[1.7] [&_p]:text-ink-700 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-ink-700">
          <h1 className="font-display text-display-2 text-ink-950">{title}</h1>
          <p className="!mt-2 text-small text-muted">Last updated {updated}</p>
          {children}
        </article>
      </main>
      <Footer />
    </>
  );
}
