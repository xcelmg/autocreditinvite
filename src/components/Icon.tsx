const PATHS = {
  key: "M15.5 7.5a3.5 3.5 0 1 1-4.6 3.3L4 17.7V20h2.3v-1.5h1.5V17h1.5l1.6-1.6a3.5 3.5 0 0 1 4.6-7.9ZM16 8h.01",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  shield: "M12 3 5 6v6c0 4.4 3 7.9 7 9 4-1.1 7-4.6 7-9V6l-7-3Zm-3 9 2 2 4-4",
  lock: "M8 10.5V7.75a4 4 0 0 1 8 0v2.75M7.5 10.5h9a2.5 2.5 0 0 1 2.5 2.5v5.5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18.5V13a2.5 2.5 0 0 1 2.5-2.5Zm4.5 4.25v2.25",
  alert: "M10.3 4.6 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0ZM12 9.5v4M12 17h.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v5.5M12 7.75h.01",
  card: "M3.5 6.5h17v11h-17v-11Zm0 3.5h17M7 14.5h4",
  check: "m5 12.5 4.5 4.5L19 7.5",
  map: "M9 4 3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5L9 4Zm0 0v13.5m6-11v13.5",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  back: "M19 12H5m6-6-6 6 6 6",
  message: "M21 12a8.5 8.5 0 0 1-12.3 7.6L4 21l1.4-4.7A8.5 8.5 0 1 1 21 12ZM8.5 12h.01M12 12h.01M15.5 12h.01",
  doc: "M8 3h8l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h3Zm0 8h8M8 15h6",
  phone: "M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm3 17h2",
  calendar: "M4 6h16v14H4V6Zm0 4h16M8 3v4m8-4v4",
  download: "M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14",
  store: "M4 10v10h16V10M3 10l2-6h14l2 6H3Zm6 10v-5h6v5",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "h-6 w-6", strokeWidth = 1.75 }: { name: IconName; className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
