// Helpers for the simple {open: "HH:mm", close: "HH:mm"} schema.
export type OpenHours = { open?: string; close?: string } | null | undefined;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

export function isShopOpen(oh: OpenHours, now: Date = new Date()): boolean {
  if (!oh || !oh.open || !oh.close) return true; // unknown → assume open
  const open = toMinutes(oh.open);
  const close = toMinutes(oh.close);
  if (Number.isNaN(open) || Number.isNaN(close)) return true;
  const cur = now.getHours() * 60 + now.getMinutes();
  // Same-day window only; for overnight windows treat as open if close < open and cur >= open OR cur < close
  if (close > open) return cur >= open && cur < close;
  return cur >= open || cur < close;
}

export function formatHours(oh: OpenHours): string {
  if (!oh || !oh.open || !oh.close) return "Open";
  return `${oh.open} – ${oh.close}`;
}
