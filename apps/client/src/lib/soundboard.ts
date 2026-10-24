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
