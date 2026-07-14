// Synthesized electric SFX via the Web Audio API. No audio assets needed.
// Silently no-ops on platforms without AudioContext (e.g. native without web).

type AC = AudioContext;

let ctx: AC | null = null;

function ac(): AC | null {
  try {
    const g = globalThis as any;
    const Ctor = g.AudioContext || g.webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  c: AC,
  type: OscillatorType,
  f0: number,
  f1: number,
  dur: number,
  vol: number,
  delay = 0,
) {
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Short burst of filtered noise — the crackle in every zap. */
function crackle(c: AC, dur: number, vol: number, freq: number, delay = 0) {
  const t0 = c.currentTime + delay;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(freq, t0);
  bp.frequency.exponentialRampToValueAtTime(freq * 0.35, t0 + dur);
  bp.Q.value = 1.2;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp).connect(gain).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  /** Relay click when a fork gate flips. */
  switch() {
    const c = ac();
    if (!c) return;
    tone(c, 'square', 950, 620, 0.05, 0.12);
    crackle(c, 0.04, 0.1, 3200);
  },

  /** Rising chirp per orb; pitch climbs with the combo. */
  orb(combo: number) {
    const c = ac();
    if (!c) return;
    const base = 520 * Math.pow(1.06, Math.min(combo, 16));
    tone(c, 'sine', base, base * 2.1, 0.11, 0.16);
    tone(c, 'triangle', base * 1.5, base * 3, 0.09, 0.07, 0.02);
  },

  /** Gem jackpot: quick sparkly arpeggio. */
  gem() {
    const c = ac();
    if (!c) return;
    [660, 880, 1320, 1760].forEach((f, i) =>
      tone(c, 'triangle', f, f * 1.01, 0.14, 0.15, i * 0.055),
    );
    crackle(c, 0.25, 0.06, 5000);
  },

  /** Blown fuse: hard electrical crack and a dying buzz. */
  zap() {
    const c = ac();
    if (!c) return;
    crackle(c, 0.28, 0.4, 2400);
    crackle(c, 0.16, 0.3, 900, 0.03);
    tone(c, 'sawtooth', 320, 42, 0.4, 0.22);
  },

  /** New circuit fanfare. */
  levelUp() {
    const c = ac();
    if (!c) return;
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(c, 'square', f, f, 0.13, 0.09, i * 0.09),
    );
  },

  /** Game over: long sad power-down. */
  gameOver() {
    const c = ac();
    if (!c) return;
    tone(c, 'sawtooth', 220, 30, 1.1, 0.16);
    crackle(c, 0.5, 0.2, 1500, 0.05);
  },
};
