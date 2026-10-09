/*
 * The My Auto Credit mark: a rounded shield with a check. In full colour the
 * shield is a charcoal outline and the check is the accent blue, running
 * out past the shield's right shoulder the way the old badge's check crossed
 * its gear. Pass `check` the same colour as `shield` for a one-colour mark.
 * `halo` is the colour behind the mark: it cuts a gap where the check crosses
 * the shield outline. Decorative (aria-hidden); the wordmark carries the name.
 */

const SHIELD = "M16 3.6 25.6 7v8.1c0 6.1-3.9 10.9-9.6 13.3C10.3 26 6.4 21.2 6.4 15.1V7L16 3.6Z";
const CHECK = "M10.6 15.6 14.6 19.6 27.6 5.6";

export function Mark({
  shield,
  check,
  halo,
  fill = "none",
  size,
  className,
  x,
  y,
}: {
  shield: string;
  check: string;
  halo?: string;
  /** The shield's fill (the favicon fills it). */
  fill?: string;
  size?: number;
  className?: string;
  /** Position when nested inside another svg. */
  x?: number;
  y?: number;
}) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} x={x} y={y} className={className} aria-hidden="true" fill="none">
      <path d={SHIELD} fill={fill} stroke={shield} strokeWidth="2.6" strokeLinejoin="round" />
      {halo && <path d={CHECK} stroke={halo} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />}
      <path d={CHECK} stroke={check} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
