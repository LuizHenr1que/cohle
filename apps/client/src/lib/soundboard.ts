// Soundboard: short sounds anyone in a call can trigger for everybody. Everything is synthesized (WebAudio + the system voice), no audio files shipped.
export type SoundId = "scare" | "fireworks" | "laugh" | "call" | "tatakae";
export const SOUNDS: { id: SoundId; label: string }[] = [
  { id: "scare", label: "Susto" },
  { id: "fireworks", label: "Fogos" },
  { id: "laugh", label: "Risos" },
  { id: "call", label: "Chamando" },
  { id: "tatakae", label: "Tatakae" },
];
export const soundLabel = (id: string) => SOUNDS.find((s) => s.id === id)?.label ?? id;

const KEY = "cohle:soundboard";
export const soundboardOn = () => { try { return localStorage.getItem(KEY) !== "off"; } catch { return true; } };
export const setSoundboardOn = (on: boolean) => { try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* private mode */ } };

let ctx: AudioContext | null = null;
const get = () => { try { ctx ??= new AudioContext(); if (ctx.state === "suspended") void ctx.resume(); return ctx; } catch { return null; } };
let noiseBuf: AudioBuffer | null = null;

type Tone = { type?: OscillatorType; f0: number; f1?: number; t: number; d: number; v: number };
function tone(c: AudioContext, o: Tone) {
  const osc = c.createOscillator(), g = c.createGain(), s = c.currentTime + o.t;
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.f0, s);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, s + o.d);
  g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(o.v, s + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, s + o.d);
  osc.connect(g).connect(c.destination); osc.start(s); osc.stop(s + o.d + 0.03);
}
function noise(c: AudioContext, o: { t: number; d: number; v: number; kind: BiquadFilterType; freq: number; q?: number }) {
  noiseBuf ??= (() => { const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), a = b.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; return b; })();
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), s = c.currentTime + o.t;
  src.buffer = noiseBuf; f.type = o.kind; f.frequency.value = o.freq; if (o.q) f.Q.value = o.q;
  g.gain.setValueAtTime(o.v, s); g.gain.exponentialRampToValueAtTime(0.0001, s + o.d);
  src.connect(f).connect(g).connect(c.destination); src.start(s, Math.random()); src.stop(s + o.d + 0.03);
}
function speak(text: string, lang: string, pitch: number, rate: number, delayMs = 0) {
  const say = () => {
    try {
      const ss = window.speechSynthesis; if (!ss) return;
      const u = new SpeechSynthesisUtterance(text);
      const base = lang.split("-")[0];
      const v = ss.getVoices().find((x) => x.lang === lang) ?? ss.getVoices().find((x) => x.lang.startsWith(base));
      if (v) u.voice = v;
      u.lang = v?.lang ?? lang; u.pitch = pitch; u.rate = rate; u.volume = 1;
      ss.speak(u);
    } catch { /* no system voice available */ }
  };
  delayMs ? setTimeout(say, delayMs) : say();
}

const PLAY: Record<SoundId, (c: AudioContext) => void> = {
  scare(c) {
    tone(c, { f0: 95, f1: 38, t: 0, d: 0.9, v: 0.9 });
    tone(c, { type: "sawtooth", f0: 880, f1: 1900, t: 0, d: 1.3, v: 0.32 });
    tone(c, { type: "sawtooth", f0: 932, f1: 2050, t: 0, d: 1.3, v: 0.3 });     // a semitone apart: harsh on purpose
    noise(c, { t: 0, d: 0.7, v: 0.6, kind: "highpass", freq: 1800 });
  },
  fireworks(c) {
    [0, 1, 1.9].forEach((t, i) => {
      tone(c, { f0: 380 + i * 90, f1: 2300, t, d: 0.55, v: 0.14 });                  // whistle up
      noise(c, { t: t + 0.55, d: 0.7, v: 0.8, kind: "lowpass", freq: 1400 });          // bang
      tone(c, { f0: 130, f1: 38, t: t + 0.55, d: 0.6, v: 0.8 });
      for (let k = 0; k < 14; k++) noise(c, { t: t + 0.7 + Math.random() * 0.9, d: 0.05, v: 0.22, kind: "highpass", freq: 4500 });   // crackle
    });
  },
  laugh(c) {
    for (let i = 0; i < 7; i++) {
      const t = i * 0.21, f = 330 - i * 14 + Math.random() * 18;
      tone(c, { type: "sawtooth", f0: f * 1.15, f1: f, t, d: 0.16, v: 0.0 + 0.2 });
      noise(c, { t, d: 0.13, v: 0.22, kind: "bandpass", freq: 1100 + Math.random() * 300, q: 3 });
    }
  },
  call(c) {
    for (let r = 0; r < 3; r++) for (const t of [0, 0.45]) {
      const s = r * 1.5 + t;
      tone(c, { type: "square", f0: 440, t: s, d: 0.34, v: 0.07 }); tone(c, { type: "square", f0: 480, t: s, d: 0.34, v: 0.07 });
    }
    speak("Ei! Estão te chamando!", "pt-BR", 1.1, 1.05, 4600);
  },
  tatakae(c) {
    tone(c, { f0: 85, f1: 30, t: 0, d: 0.7, v: 0.95 }); tone(c, { f0: 85, f1: 30, t: 0.5, d: 0.7, v: 0.95 });
    noise(c, { t: 0, d: 0.3, v: 0.4, kind: "lowpass", freq: 600 });
    speak("Tatakae! Tatakae!", "ja-JP", 0.6, 1.0, 650);
  },
};

export function playSound(id: string) {
  const c = get(); const fn = PLAY[id as SoundId];
  if (c && fn) fn(c);
}

// ---- sounds of shop effects (same rule: synthesized, nothing downloaded) ----
export type FxSound = "hohoho" | "whoosh" | "sleigh" | "boo" | "witch" | "glitch" | "gameon" | "snip" | "tada" | "pop" | "fireworks";
// Real recordings (CC0, see public/sfx/CREDITS.txt), ~30 KB in total, fetched only the first time they play. If one cannot load or play, the synthesized version below takes over.
const SAMPLES: Partial<Record<FxSound, { file: string; vol: number }>> = { hohoho: { file: "sfx/santa-hohoho.mp3", vol: 0.9 }, boo: { file: "sfx/ghost-boo.mp3", vol: 0.85 } };
const sampleCache = new Map<string, HTMLAudioElement>();
// Rule (CLAUDE.md): no theme makes noise on its own. A Loja sound only plays right after a click/tap/key of the person, or when it is an effect another
// person sent on purpose into the call we are in (`others`). Anything else (a stray timer, a bug) is refused here, so it cannot happen by construction.
let lastGesture = 0;
if (typeof window !== "undefined") for (const e of ["pointerdown", "click", "keydown", "touchstart"]) window.addEventListener(e, () => { lastGesture = Date.now(); }, { capture: true, passive: true });
export const GESTURE_WINDOW_MS = 4000;
export function playFx(id: FxSound, opts?: { others?: boolean }) {
  if (!opts?.others && Date.now() - lastGesture > GESTURE_WINDOW_MS) return;
  const sm = SAMPLES[id];
  if (sm) {
    try {
      let a = sampleCache.get(sm.file); if (!a) { a = new Audio(sm.file); a.preload = "auto"; sampleCache.set(sm.file, a); }
      a.volume = sm.vol; a.currentTime = 0;
      void a.play().catch(() => synthFx(id));
      return;
    } catch { /* falls back to the synthesized sound */ }
  }
  synthFx(id);
}
function synthFx(id: FxSound) {
  const c = get(); if (!c) return;
  if (id === "hohoho") {                                              // three falling low notes + a handful of bells and paper
    [0, 0.34, 0.68].forEach((t, i) => tone(c, { type: "triangle", f0: 190 - i * 18, f1: 120 - i * 14, t, d: 0.3, v: 0.22 }));
    [1568, 2093, 1760, 2349, 1976].forEach((f, i) => tone(c, { f0: f, t: 0.08 + i * 0.07, d: 0.34, v: 0.05 }));
    noise(c, { t: 1.05, d: 0.5, v: 0.12, kind: "highpass", freq: 3200 });
  } else if (id === "boo") {                                         // a low ghostly "buuu" that rises and falls, a little wind on top
    tone(c, { type: "sine", f0: 150, f1: 95, t: 0, d: 0.9, v: 0.2 }); tone(c, { type: "triangle", f0: 220, f1: 130, t: 0.1, d: 0.8, v: 0.08 });
    noise(c, { t: 0.2, d: 0.9, v: 0.07, kind: "bandpass", freq: 900, q: 0.7 });
  } else if (id === "glitch") {                                      // a digital "access granted": quick square-wave bleeps and a burst of static
    [880, 1320, 660, 1760, 990].forEach((f, i) => tone(c, { type: "square", f0: f, t: i * 0.06, d: 0.05, v: 0.05 }));
    tone(c, { type: "square", f0: 440, f1: 1760, t: 0.34, d: 0.2, v: 0.05 }); noise(c, { t: 0.05, d: 0.35, v: 0.08, kind: "highpass", freq: 4200 });
  } else if (id === "gameon") {                                      // an arcade start jingle: rising arpeggio
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, { type: "square", f0: f, t: i * 0.085, d: 0.11, v: 0.06 })); tone(c, { type: "triangle", f0: 1047, t: 0.5, d: 0.35, v: 0.1 });
  } else if (id === "snip") {                                        // scissors: three snips and a little bell
    [0, 0.14, 0.28].forEach((t) => { noise(c, { t, d: 0.06, v: 0.22, kind: "highpass", freq: 5200 }); tone(c, { type: "square", f0: 2600, f1: 1800, t, d: 0.04, v: 0.04 }); });
    tone(c, { f0: 2093, t: 0.46, d: 0.5, v: 0.07 }); tone(c, { f0: 2637, t: 0.5, d: 0.45, v: 0.05 });
  } else if (id === "tada") {                                        // a royal fanfare: bright chord with a sparkle
    [523, 659, 784].forEach((f) => tone(c, { type: "triangle", f0: f, t: 0, d: 0.5, v: 0.08 })); [1047, 1319, 1568].forEach((f, i) => tone(c, { f0: f, t: 0.18 + i * 0.07, d: 0.5, v: 0.06 }));
    [3136, 3520, 4186, 3729].forEach((f, i) => tone(c, { f0: f, t: 0.4 + i * 0.06, d: 0.25, v: 0.03 }));
  } else if (id === "pop") {                                         // a champagne cork: a sharp pop, then fizz
    noise(c, { t: 0, d: 0.08, v: 0.4, kind: "lowpass", freq: 1800 }); tone(c, { type: "sine", f0: 520, f1: 90, t: 0, d: 0.14, v: 0.25 });
    noise(c, { t: 0.1, d: 1.1, v: 0.1, kind: "highpass", freq: 4500 }); [1568, 2093, 2637].forEach((f, i) => tone(c, { f0: f, t: 0.35 + i * 0.09, d: 0.3, v: 0.04 }));
  } else if (id === "fireworks") {                                   // three launches: whistle up, boom, crackle
    [0, 0.55, 1.05].forEach((t, i) => { tone(c, { type: "sine", f0: 500 + i * 120, f1: 1700 + i * 200, t, d: 0.35, v: 0.05 }); tone(c, { type: "sine", f0: 110, f1: 38, t: t + 0.36, d: 0.5, v: 0.34 }); noise(c, { t: t + 0.36, d: 0.7, v: 0.22, kind: "lowpass", freq: 900 }); noise(c, { t: t + 0.42, d: 0.9, v: 0.1, kind: "highpass", freq: 5200 }); });
  } else if (id === "witch") {                                        // a short cackle: quick rising squeaks
    [0, 0.13, 0.26, 0.39].forEach((t, i) => tone(c, { type: "sawtooth", f0: 520 + i * 40, f1: 900 + i * 60, t, d: 0.1, v: 0.05 }));
  } else if (id === "sleigh") {                                       // bells
    for (let i = 0; i < 10; i++) tone(c, { f0: 2200 + (i % 3) * 330, t: i * 0.11, d: 0.2, v: 0.04 });
  } else {                                                            // whoosh of a giant reaction
    noise(c, { t: 0, d: 0.9, v: 0.2, kind: "bandpass", freq: 700, q: 0.6 });
    tone(c, { type: "sine", f0: 260, f1: 90, t: 0, d: 0.7, v: 0.12 });
  }
}
