"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Footer, Header } from "./Chrome";
import { LogoMark } from "./Logo";

/*
 * The last-resort page when something fails to load or render (app/error.tsx
 * and app/global-error.tsx) — never a bare browser error. Try again re-fetches
 * and re-renders the page; the signed session, and the step it's on, stay.
 * Offline, it says so, so a dead connection reads as "reconnect".
 */

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine !== false, () => true);
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <>
      <Header cta={false} />
      <main id="main" className="flex flex-1 flex-col justify-center px-5 py-24 sm:px-8">
        <div role="alert" className="mx-auto w-full max-w-xl">
          <LogoMark className="h-14 w-14" />
          <p className="eyebrow mt-8">{online ? "One moment" : "You're offline"}</p>
          <h1 className="mt-3 font-display text-display-2 text-ink-950">{online ? "That didn't load." : "No connection."}</h1>
          <p className="measure mt-4 text-lede text-muted">
            {online
              ? "It's usually a weak signal. Anything you've already sent is saved — tap Try again to pick up where you left off."
              : "This device lost its connection. Reconnect to Wi-Fi or cellular data, then tap Try again — anything you've already sent is saved."}
          </p>
          <button type="button" onClick={() => retry()} className="btn-primary mt-8 px-6 py-3.5 text-[17px]">
            Try again
          </button>
          <p className="mt-6 text-small text-muted">Still stuck? Call the number on your mailer and the dealership will help.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
