/*
 * Copy for a request that didn't get through (no signal, a timeout, the
 * dealership's systems not answering). The screen and what was typed stay;
 * the visitor taps the same button again. `label` is that button's words.
 */

export function retryMessage(label: string): string {
  return `We couldn't reach the dealership just now. Check your connection and tap “${label}” to try again.`;
}

export function bookRetryMessage(label: string): string {
  return `We couldn't save that time just now. Your details are saved — tap “${label}” to try again, or your specialist will text you to set a time.`;
}
