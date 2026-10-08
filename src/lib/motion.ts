/**
 * The inline script for <head>: turn the scroll-motion gate (html.mac-motion) on before first paint, and off
 * again after 4 s if no Reveal has claimed it, so a failed or slow bundle never leaves content hidden.
 * Reveal (components/Motion.tsx) sets window.__macReveal when it mounts.
 */
export const MOTION_GATE = `document.documentElement.classList.add("mac-motion");setTimeout(function(){if(!window.__macReveal)document.documentElement.classList.remove("mac-motion")},4000)`;
