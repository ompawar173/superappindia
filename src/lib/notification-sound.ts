// Tiny WebAudio "ring" — no asset needed. Loops until stop().
let ctx: AudioContext | null = null;
let timer: number | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function beep() {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const t = c.currentTime;
  [880, 1320].forEach((freq, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t + i * 0.18);
    g.gain.exponentialRampToValueAtTime(0.35, t + i * 0.18 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.16);
    o.connect(g).connect(c.destination);
    o.start(t + i * 0.18);
    o.stop(t + i * 0.18 + 0.18);
  });
}

export const notificationSound = {
  start() {
    if (timer != null) return;
    beep();
    timer = window.setInterval(beep, 1500);
  },
  stop() {
    if (timer != null) { window.clearInterval(timer); timer = null; }
  },
  ping() { beep(); },
};
