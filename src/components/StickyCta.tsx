"use client";

import { useEffect, useState } from "react";

/*
 * The mobile bar that slides in once every Invitation Code field on the page
 * (`watch`: comma-separated ids) has scrolled out of view, and back out when
 * one returns. Tapping it scrolls to the first field and focuses it. Mounted
 * on the home page only; it hides again once the closing field is scrolled past.
 */
export function StickyCta({ watch }: { watch: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const els = watch.split(",").map((id) => document.getElementById(id.trim())).filter((el): el is HTMLElement => !!el);
    if (!els.length || !("IntersectionObserver" in window)) return;
    const visible = new Map<Element, boolean>();
    // Hidden while any field is on screen, near the top, or once the last field has been scrolled past.
    const update = () => {
      const pastLast = els[els.length - 1].getBoundingClientRect().bottom < 0;
      setShow(![...visible.values()].some(Boolean) && window.scrollY > 200 && !pastLast);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target, e.isIntersecting);
        update();
      },
      { threshold: 0 },
    );
    els.forEach((el) => io.observe(el));
    // A field can leave the screen before the 200 px mark (on a phone the hero field does): check again on scroll.
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [watch]);

  const target = watch.split(",")[0].trim();
  return (
    <div
      className="sticky-cta fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
      data-show={show}
      aria-hidden={!show}
    >
      <a
        href="#start"
        onClick={(e) => {
          e.preventDefault();
          const el = document.getElementById(target);
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          el?.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "center" });
          window.setTimeout(() => el?.focus({ preventScroll: true }), reduce ? 0 : 450);
        }}
        className="btn-primary w-full py-3 text-[17px]"
        tabIndex={show ? 0 : -1}
      >
        Enter my Invitation Code
      </a>
    </div>
  );
}
