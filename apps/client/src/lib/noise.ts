// Microphone noise suppression. Two neural engines run locally in an AudioWorklet (free, open source, no cloud):
//   rnnoise : tiny and light (xiph/rnnoise), made for voice calls
//   gtcrn   : newer model, better on non-stationary noise (keyboard, voices in the background), a bit heavier
// "browser" is Chromium's built-in suppressor and "off" disables everything.
import type { AudioProcessorOptions, Track, TrackProcessor } from "livekit-client";
import { GtcrnWorkletNode, RnnoiseWorkletNode, loadGtcrn, loadRnnoise } from "@sapphi-red/web-noise-suppressor";
import rnnoiseWorklet from "@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url";
import gtcrnWorklet from "@sapphi-red/web-noise-suppressor/gtcrnWorklet.js?url";
import rnnoiseWasm from "@sapphi-red/web-noise-suppressor/rnnoise.wasm?url";
import rnnoiseSimdWasm from "@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url";
import gtcrnWasm from "@sapphi-red/web-noise-suppressor/gtcrn.wasm?url";

export type NoiseMode = "off" | "browser" | "rnnoise" | "gtcrn";
export const NOISE_MODES: { id: NoiseMode; label: string; hint: string }[] = [
  { id: "rnnoise", label: "Forte (recomendado)", hint: "Remove teclado, ventilador e ruído de fundo, mantendo a sua voz. Roda no seu computador, com pouco uso de CPU." },
  { id: "gtcrn", label: "Máxima", hint: "Modelo mais novo, remove um pouco mais de ruído. Usa bem mais CPU: evite durante jogos pesados." },
  { id: "browser", label: "Padrão", hint: "Supressão básica do próprio sistema. Leve, mas deixa passar mais ruído." },
  { id: "off", label: "Desligada", hint: "Sem tratamento. Use com um microfone profissional." },
];
// The neural models also take a little level off the voice (measured with real speech: ~-6 dB for rnnoise, ~-10 dB for gtcrn; the gains below leave it within ~0.5 dB).
// A make-up gain brings it back, and a limiter keeps loud peaks from clipping.
const MAKEUP: Record<"rnnoise" | "gtcrn", number> = { rnnoise: 2.7, gtcrn: 4.1 };
export const DEFAULT_NOISE: NoiseMode = "rnnoise";
const KEY = "cohle:noise";
export const loadNoiseMode = (): NoiseMode => { try { const v = localStorage.getItem(KEY) as NoiseMode | null; return v && NOISE_MODES.some((m) => m.id === v) ? v : DEFAULT_NOISE; } catch { return DEFAULT_NOISE; } };
export const saveNoiseMode = (m: NoiseMode) => { try { localStorage.setItem(KEY, m); } catch { /* ignore */ } };
export const isNeural = (m: NoiseMode) => m === "rnnoise" || m === "gtcrn";
/** Chromium's own suppressor is only used on its own: stacking it under a neural model hurts quality. */
export const captureOptions = (m: NoiseMode) => ({ echoCancellation: true, autoGainControl: true, noiseSuppression: m === "browser" });

// wasm binaries are downloaded once per session
let rnnoiseBin: Promise<ArrayBuffer> | undefined, gtcrnBin: Promise<ArrayBuffer> | undefined;

export class NoiseProcessor implements TrackProcessor<Track.Kind.Audio, AudioProcessorOptions> {
  name = "cohle-noise";
  processedTrack?: MediaStreamTrack;
  private ctx?: AudioContext;
  private nodes: AudioNode[] = [];
  constructor(private mode: "rnnoise" | "gtcrn") {}

  async init(opts: AudioProcessorOptions) { await this.build(opts.track); }
  async restart(opts: AudioProcessorOptions) { await this.teardown(); await this.build(opts.track); }
  async destroy() { await this.teardown(); }

  private async build(track: MediaStreamTrack) {
    // both models are trained on 48 kHz mono speech: own context at 48 kHz so nothing is resampled in between
    const ctx = new AudioContext({ sampleRate: 48000, latencyHint: "interactive" });
    this.ctx = ctx;
    let node: AudioWorkletNode;
    if (this.mode === "rnnoise") {
      rnnoiseBin ??= loadRnnoise({ url: rnnoiseWasm, simdUrl: rnnoiseSimdWasm });
      const [wasmBinary] = await Promise.all([rnnoiseBin, ctx.audioWorklet.addModule(rnnoiseWorklet)]);
      node = new RnnoiseWorkletNode(ctx, { maxChannels: 1, wasmBinary });
    } else {
      gtcrnBin ??= loadGtcrn({ url: gtcrnWasm });
      const [wasmBinary] = await Promise.all([gtcrnBin, ctx.audioWorklet.addModule(gtcrnWorklet)]);
      node = new GtcrnWorkletNode(ctx, { maxChannels: 1, wasmBinary });
    }
    const src = ctx.createMediaStreamSource(new MediaStream([track]));
    const dst = ctx.createMediaStreamDestination();
    const gain = ctx.createGain(); gain.gain.value = MAKEUP[this.mode];
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.12;
    src.connect(node); node.connect(gain); gain.connect(limiter); limiter.connect(dst);
    this.nodes = [src, node, gain, limiter, dst];
    this.processedTrack = dst.stream.getAudioTracks()[0];
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
  }
  private async teardown() {
    this.nodes.forEach((n) => { try { n.disconnect(); } catch { /* already disconnected */ } });
    this.nodes = []; this.processedTrack = undefined;
    await this.ctx?.close().catch(() => {}); this.ctx = undefined;
  }
}
