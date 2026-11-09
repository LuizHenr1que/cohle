// Windows loopback captures everything the sharer hears, including the call.
// Viewers would hear their own voice inside the live stream. This subtracts those voices
// (the remote microphones, at the volume the sharer is actually playing) before the audio is published.

export type VoiceTap = { track: MediaStreamTrack; volume: number };

/** Best delay, in samples of these arrays, of `voice` inside `screen`. Null when there is no clear match. */
export function alignLag(screen: Float32Array, voice: Float32Array): { lag: number; score: number } | null {
  let energy = 0;
  for (let i = 0; i < voice.length; i++) energy += voice[i] * voice[i];
  if (energy < 1e-4) return null;
  const maxLag = Math.min(800, voice.length - 1);
  let best = 0, lag = 0;
  for (let d = 0; d <= maxLag; d++) {
    let c = 0, ea = 0, eb = 0;
    const n = screen.length - d;
    for (let i = 0; i < n; i += 2) {
      const x = screen[i + d], y = voice[i];
      c += x * y; ea += x * x; eb += y * y;
    }
    const s = c / Math.sqrt(ea * eb + 1e-12);
    if (s > best) { best = s; lag = d; }
  }
  return best >= 0.35 ? { lag, score: best } : null;
}

export function mixOutCall(screen: MediaStreamTrack, voices: () => VoiceTap[]): { track: MediaStreamTrack; stop: (end?: boolean) => void } {
  const ctx = new AudioContext({ latencyHint: "interactive" });
  const dest = ctx.createMediaStreamDestination();
  const screenSrc = ctx.createMediaStreamSource(new MediaStream([screen]));
  screenSrc.connect(dest);
  const bus = ctx.createGain();
  const delay = ctx.createDelay(0.25);
  const inv = ctx.createGain();
  inv.gain.value = 0;
  bus.connect(delay); delay.connect(inv); inv.connect(dest);

  let nodes: { track: MediaStreamTrack; src: MediaStreamAudioSourceNode; gain: GainNode }[] = [];
  const sync = () => {
    const want = voices().filter((v) => v.track.readyState === "live");
    const same = nodes.length === want.length && nodes.every((n, i) => n.track === want[i].track);
    if (!same) {
      nodes.forEach((n) => { try { n.src.disconnect(); } catch { /* already gone */ } });
      nodes = want.map((v) => {
        const src = ctx.createMediaStreamSource(new MediaStream([v.track]));
        const gain = ctx.createGain();
        gain.gain.value = v.volume;
        src.connect(gain); gain.connect(bus);
        return { track: v.track, src, gain };
      });
    } else nodes.forEach((n, i) => { n.gain.gain.value = want[i].volume; });
  };

  let probing = false;
  const probe = () => {
    if (probing || ctx.state === "closed") return;
    sync();
    if (!nodes.length) { inv.gain.value = 0; return; }
    probing = true;
    const rate = 4000, step = Math.max(1, Math.round(ctx.sampleRate / rate)), need = Math.floor(0.35 * rate);
    const a: number[] = [], b: number[] = [];
    const merger = ctx.createChannelMerger(2);
    screenSrc.connect(merger, 0, 0);
    bus.connect(merger, 0, 1);
    const proc = ctx.createScriptProcessor(4096, 2, 1);
    const sink = ctx.createGain();
    sink.gain.value = 0;
    merger.connect(proc); proc.connect(sink); sink.connect(ctx.destination);
    proc.onaudioprocess = (ev) => {
      const ch0 = ev.inputBuffer.getChannelData(0), ch1 = ev.inputBuffer.getChannelData(1);
      for (let i = 0; i < ch0.length && a.length < need; i += step) { a.push(ch0[i]); b.push(ch1[i]); }
      if (a.length < need) return;
      try { screenSrc.disconnect(merger); bus.disconnect(merger); proc.disconnect(); sink.disconnect(); } catch { /* already gone */ }
      probing = false;
      const hit = alignLag(Float32Array.from(a), Float32Array.from(b));
      if (!hit) { inv.gain.value = 0; return; }
      delay.delayTime.value = hit.lag / rate;
      inv.gain.value = -1;
    };
  };

  const timer = setInterval(probe, 4000);
  void ctx.resume().then(probe).catch(() => {});
  const out = dest.stream.getAudioTracks()[0];
  return {
    track: out,
    stop: (end = false) => {
      clearInterval(timer);
      if (end) { try { screen.stop(); } catch { /* already stopped */ } }
      try { out.stop(); } catch { /* already stopped */ }
      void ctx.close().catch(() => {});
    },
  };
}
