export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : digits;
}

/** A US number formatted as far as it's typed: "(334", "(334) 5", "(334) 555-0", "(334) 555-0142". */
export function formatPhoneTyped(value: string): string {
  let d = value.replace(/\D/g, "");
  if (d.length > 10 && d[0] === "1") d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length < 4) return d && `(${d}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}${d.length > 6 ? `-${d.slice(6)}` : ""}`;
}

/**
 * onChange for a phone field: formats the edit as typed and returns the new value. The caret stays beside the
 * same digit, and deleting a "(", ")", space or "-" deletes the digit beside it instead.
 */
export function formatPhoneInput(e: { target: HTMLInputElement; nativeEvent: Event }, prev: string): string {
  const el = e.target;
  const type = (e.nativeEvent as InputEvent).inputType;
  let d = el.value.replace(/\D/g, "");
  // Digits before the caret: it goes back after the same digit once the value is reformatted.
  let n = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, "").length;
  if (d === prev.replace(/\D/g, "")) {
    if (type === "deleteContentBackward" && n > 0) {
      d = d.slice(0, n - 1) + d.slice(n);
      n--;
    } else if (type === "deleteContentForward") {
      d = d.slice(0, n) + d.slice(n + 1);
    }
  }
  if (d.length > 10 && d[0] === "1" && n > 0) n--;
  const value = formatPhoneTyped(d);
  n = Math.min(n, value.replace(/\D/g, "").length);
  let pos = value ? 1 : 0;
  for (let i = 0, seen = 0; seen < n; i++) if (/\d/.test(value[i]) && ++seen === n) pos = i + 1;
  el.value = value;
  if (document.activeElement === el) el.setSelectionRange(pos, pos);
  return value;
}

export function formatPin(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 9);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join("-");
}

export function mapsUrl(parts: string[]): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.filter(Boolean).join(", "))}`;
}
