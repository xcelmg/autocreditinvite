"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

/*
 * Scroll motion. Reveal marks a block once 15% of it is on screen (data-reveal="in", once); globals.css then
 * moves it in by its `motion`:
 *   "section"     — direct children rise 48 px and fade, 90 ms apart; an eyebrow's rule draws in after them
 *   "list"        — items rise 24 px, 80 ms apart; [data-pop] numbers pop in
 *   "media-left"/"media-right" — slides in 64 px from its side, scaling up; a photo inside settles from 106%;
 *                   with `card`, a soft shadow grows under it
 *   "close"       — the closing band: its background fades in, its lines rise, the code field last
 * Content is hidden only under html.mac-motion, which the MOTION_GATE script (lib/motion.ts) sets in <head>
 * before paint and drops again if no Reveal has started within 4 s, so a page without JavaScript (or with a
 * failed bundle) shows everything. Parallax drifts the hero art by at most 32 px. Transform and opacity only; nothing shifts.
 */

export type MotionKind = "section" | "list" | "media-left" | "media-right" | "close";
type Tag = "div" | "section" | "ol" | "ul";

declare global {
  interface Window {
    __macReveal?: boolean;
  }
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function Reveal({
  as = "div",
  motion = "section",
  card = false,
  className,
  id,
  children,
  ...rest
}: {
  as?: Tag;
  motion?: MotionKind;
  card?: boolean;
  className?: string;
  id?: string;
  children: ReactNode;
  "aria-labelledby"?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  // Before paint: keep the gate on (React's dev remount can clear the class the inline script set on <html>).
  useIsoLayoutEffect(() => {
    window.__macReveal = true;
    document.documentElement.classList.add("mac-motion");
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.dataset.reveal = "in";
      return;
    }
    // Tall blocks can never reach 15% visible on a phone; ask for a fifth of the viewport instead.
    const threshold = Math.min(0.15, (window.innerHeight * 0.2) / Math.max(1, el.offsetHeight));
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset.reveal = "in";
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const T = as as "div";
  return (
    <T
      ref={ref as React.RefObject<HTMLDivElement>}
      id={id}
      data-reveal=""
      data-motion={motion}
      data-card={card ? "" : undefined}
      className={className}
      {...rest}
    >
      {children}
    </T>
  );
}

export function Parallax({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(0, ${Math.min(32, window.scrollY * 0.09).toFixed(2)}px, 0)`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
