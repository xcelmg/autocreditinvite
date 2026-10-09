"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { isEntryPath } from "@/lib/visitor";

/*
 * Reports this page view to /api/visit, which counts the visitor's `visit` for
 * the day. Only a browser that runs the page's script, isn't driven by
 * automation and keeps the page on screen for DWELL_MS reports, so scanners and
 * link checkers that fetch pages never count. Once per full page load; a client
 * navigation reports only when the first page wasn't an entry page.
 */

/** Time on screen before the report: long enough to drop most link checkers, short enough for people. */
const DWELL_MS = 1200;

const onScreen = () =>
  document.visibilityState === "visible" && !(document as Document & { prerendering?: boolean }).prerendering;

export function VisitBeacon() {
  const pathname = usePathname();
  const reported = useRef(false);

  useEffect(() => {
    if (reported.current || navigator.webdriver === true || !isEntryPath(window.location.pathname)) return;
    let timer: number | undefined;
    // (Re)start the dwell whenever the page comes on screen; leaving the screen cancels it.
    const arm = () => {
      window.clearTimeout(timer);
      if (!onScreen()) return;
      timer = window.setTimeout(() => {
        if (reported.current || !onScreen() || !isEntryPath(window.location.pathname)) return;
        reported.current = true;
        fetch("/api/visit", {
          method: "POST",
          credentials: "same-origin",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: window.location.pathname,
            referrer: document.referrer,
            utmMedium: new URLSearchParams(window.location.search).get("utm_medium"),
          }),
        }).catch(() => undefined);
      }, DWELL_MS);
    };
    arm();
    document.addEventListener("visibilitychange", arm);
    document.addEventListener("prerenderingchange", arm);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", arm);
      document.removeEventListener("prerenderingchange", arm);
    };
  }, [pathname]);

  return null;
}
