// Synthesized UI sounds (WebAudio) — no asset files needed.
type Note = { f: number; t: number; d: number; v?: number; type?: OscillatorType };

let ctx: AudioContext | null = null;
const get = () => {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
};

function play(notes: Note[]) {
  if (localStorage.getItem("sounds") === "off") return;
  const c = get(); if (!c) return;
  const now = c.currentTime;
  for (const n of notes) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = n.type ?? "sine";
    o.frequency.value = n.f;
    const start = now + n.t, peak = n.v ?? 0.12;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + n.d);
    o.connect(g).connect(c.destination);
    o.start(start); o.stop(start + n.d + 0.02);
  }
}

export const sounds = {
  joinSelf:   () => play([{ f: 523, t: 0, d: 0.16 }, { f: 784, t: 0.11, d: 0.26 }]),           // C5 -> G5
  leaveSelf:  () => play([{ f: 659, t: 0, d: 0.16 }, { f: 392, t: 0.11, d: 0.28 }]),           // E5 -> G4
  userJoin:   () => play([{ f: 660, t: 0, d: 0.14, v: 0.08 }, { f: 880, t: 0.09, d: 0.2, v: 0.08 }]),
  userLeave:  () => play([{ f: 440, t: 0, d: 0.14, v: 0.08 }, { f: 330, t: 0.09, d: 0.2, v: 0.08 }]),
  mute:       () => play([{ f: 300, t: 0, d: 0.12, type: "triangle" }]),
  unmute:     () => play([{ f: 600, t: 0, d: 0.12, type: "triangle" }]),
  screenOn:   () => play([{ f: 587, t: 0, d: 0.12 }, { f: 740, t: 0.09, d: 0.12 }, { f: 988, t: 0.18, d: 0.22 }]),
  screenOff:  () => play([{ f: 988, t: 0, d: 0.12 }, { f: 740, t: 0.09, d: 0.12 }, { f: 587, t: 0.18, d: 0.22 }]),
  error:      () => play([{ f: 220, t: 0, d: 0.25, type: "square", v: 0.05 }]),
  message:    () => play([{ f: 880, t: 0, d: 0.1, v: 0.06 }]),
};
