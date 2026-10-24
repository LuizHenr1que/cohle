// Voice-room load test: N bots join a Cohle voice channel, "talk" (synthetic voice with pauses)
// and one or more share a synthetic screen. Join the same room from the app to judge quality.
//
//   node bots.mjs [--count 6] [--share 1] [--minutes 20] [--api http://localhost:3001] [--server "Servidor de Teste"]
import {
  Room, RoomEvent, AudioSource, AudioFrame, LocalAudioTrack, VideoSource, VideoFrame,
  LocalVideoTrack, VideoBufferType, TrackPublishOptions, TrackSource, TrackKind, ConnectionQuality,
} from "@livekit/rtc-node";
import { io } from "socket.io-client";
import { VideoEncoding } from "@livekit/rtc-ffi-bindings";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const COUNT = Number(arg("count", 6));
const SHARERS = Math.min(COUNT, Number(arg("share", 1)));
const MINUTES = Number(arg("minutes", 20));
const API = arg("api", "http://localhost:3001");
const SERVER_NAME = arg("server", "Servidor de Teste");
const PASSWORD = arg("password", "bot-password-123");
const NAMES = arg("names", "") ? arg("names", "").split(",") : null;          // e.g. --names Bruno,Carla,Diego
const OWNER = { email: arg("owner-email", "teste1@cohle.dev"), password: arg("owner-pass", "teste12345") };

const SR = 48000, FRAME = 480; // 10 ms of mono audio
const W = 960, H = 540, FPS = 15;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function http(path, method = "GET", body, token) {
  const res = await fetch(API + path, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${data.error ?? ""}`);
  return data;
}

async function account(n) {
  const username = NAMES ? NAMES[n - 1] : `bot${n}`;
  const email = NAMES ? `${username.toLowerCase()}@demo.cohle.dev` : `bot${n}@cohle.dev`;
  try { return await http("/auth/login", "POST", { email, password: PASSWORD }); }
  catch { return await http("/auth/register", "POST", { email, username, password: PASSWORD }); }
}

// ---- synthetic voice: harmonic tone with syllable-rate wobble; talks 2-5 s, pauses 2-6 s ----
function voiceLoop(source, n, stats, signal) {
  const f0 = 110 + n * 23;                         // distinct pitch per bot so you can tell them apart
  let phase = 0, samples = 0;
  let talking = false, until = 0;
  return (async () => {
    const t0 = performance.now();
    for (let i = 0; !signal.aborted; i++) {
      const nowMs = i * 10;
      if (nowMs >= until) {
        talking = !talking;
        until = nowMs + (talking ? 2000 + Math.random() * 3000 : 2000 + Math.random() * 4000);
      }
      const buf = new Int16Array(FRAME);
      if (talking) {
        for (let k = 0; k < FRAME; k++, samples++) {
          const t = samples / SR;
          const f = f0 * (1 + 0.04 * Math.sin(2 * Math.PI * 5 * t));          // vibrato
          phase += (2 * Math.PI * f) / SR;
          const env = 0.55 + 0.45 * Math.sin(2 * Math.PI * 3.5 * t);          // syllables
          const s = Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.3 * Math.sin(3 * phase) + 0.15 * Math.sin(4 * phase);
          buf[k] = Math.round(s * env * 0.22 * 32767);
        }
      } else samples += FRAME;
      stats.talking = talking;
      await source.captureFrame(new AudioFrame(buf, SR, 1, FRAME));
      const wait = t0 + (i + 1) * 10 - performance.now();   // pace to real time
      if (wait > 0) await sleep(wait);
    }
  })();
}

// ---- synthetic "stream audio": steady arpeggio, like game/music audio shared with a screen ----
function musicLoop(source, signal) {
  const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63];
  let samples = 0;
  return (async () => {
    const t0 = performance.now();
    for (let i = 0; !signal.aborted; i++) {
      const buf = new Int16Array(FRAME);
      for (let k = 0; k < FRAME; k++, samples++) {
        const t = samples / SR, idx = Math.floor(t * 4) % notes.length, within = (t * 4) % 1;
        buf[k] = Math.round(Math.sin(2 * Math.PI * notes[idx] * t) * Math.exp(-3 * within) * 0.3 * 32767);
      }
      await source.captureFrame(new AudioFrame(buf, SR, 1, FRAME));
      const wait = t0 + (i + 1) * 10 - performance.now();
      if (wait > 0) await sleep(wait);
    }
  })();
}

// ---- synthetic screen: scrolling gradient, bouncing box, frame-counter bars ----
function screenLoop(source, n, signal, stats) {
  const bg = new Uint8Array(W * H * 4);
  const frame = new Uint8Array(W * H * 4);
  const rect = (x0, y0, w, h, r, g, b2, a2 = 255) => {
    for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++) for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) {
      const o = (y * W + x) * 4; const k = a2 / 255;
      bg[o] = bg[o] * (1 - k) + r * k; bg[o + 1] = bg[o + 1] * (1 - k) + g * k; bg[o + 2] = bg[o + 2] * (1 - k) + b2 * k; bg[o + 3] = 255;
    }
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {          // night-sky gradient desktop
    const o = (y * W + x) * 4;
    bg[o] = 22 + (x / W) * 40 + (n % 3) * 10; bg[o + 1] = 14 + (y / H) * 30; bg[o + 2] = 46 + (x / W) * 70; bg[o + 3] = 255;
  }
  rect(70, 50, 820, 420, 20, 18, 28);                                 // editor window
  rect(70, 50, 820, 34, 38, 34, 54);                                  // title bar
  rect(88, 62, 12, 12, 255, 95, 87); rect(110, 62, 12, 12, 254, 188, 46); rect(132, 62, 12, 12, 40, 200, 64);   // window buttons
  rect(70, 84, 170, 386, 28, 25, 40);                                 // file tree
  for (let i = 0; i < 9; i++) rect(86, 104 + i * 34, 60 + ((i * 37) % 90), 10, 90, 84, 120);
  const palette = [[255, 99, 132], [255, 170, 100], [120, 220, 170], [130, 170, 255], [200, 150, 255]];
  for (let i = 0; i < 12; i++) {                                       // code lines
    let x = 272 + (i % 3 === 2 ? 36 : 0);
    for (let j = 0; j < 3 + ((i * 5) % 3); j++) { const w = 40 + ((i * 53 + j * 71) % 110); const c = palette[(i + j * 2) % 5]; rect(x, 112 + i * 28, w, 10, c[0], c[1], c[2], 210); x += w + 14; }
  }
  rect(70, 440, 820, 30, 30, 120, 255, 70);                           // status bar
  let bx = 100, by = 80, vx = 7, vy = 5;
  return (async () => {
    const t0 = performance.now();
    for (let i = 0; !signal.aborted; i++) {
      frame.set(bg);
      bx += vx; by += vy;
      if (bx < 0 || bx > W - 120) vx = -vx;
      if (by < 0 || by > H - 120) vy = -vy;
      for (let y = by; y < by + 120; y++) for (let x = bx; x < bx + 120; x++) {
        const o = (y * W + x) * 4; frame[o] = 255; frame[o + 1] = 59; frame[o + 2] = 92;
      }
      // 16-bit frame counter as a row of blocks (lets a viewer see freezes / dropped frames)
      for (let b = 0; b < 16; b++) {
        const on = (i >> b) & 1;
        for (let y = H - 40; y < H - 10; y++) for (let x = 20 + b * 36; x < 20 + b * 36 + 28; x++) {
          const o = (y * W + x) * 4; const v = on ? 255 : 40; frame[o] = v; frame[o + 1] = v; frame[o + 2] = v;
        }
      }
      source.captureFrame(new VideoFrame(frame, W, H, VideoBufferType.RGBA));
      stats.frames = (stats.frames ?? 0) + 1;
      const wait = t0 + ((i + 1) * 1000) / FPS - performance.now();
      await sleep(Math.max(1, wait));
    }
  })();
}

const QUALITY = { [ConnectionQuality.QUALITY_EXCELLENT]: "excelente", [ConnectionQuality.QUALITY_GOOD]: "boa",
  [ConnectionQuality.QUALITY_POOR]: "RUIM", [ConnectionQuality.QUALITY_LOST]: "PERDIDA" };

async function main() {
  // find the test server + its voice channel through the owner account
  const owner = await http("/auth/login", "POST", OWNER);
  const server = (await http("/servers", "GET", undefined, owner.token)).find((s) => s.name === SERVER_NAME);
  if (!server) throw new Error(`servidor "${SERVER_NAME}" não encontrado`);
  const voice = server.channels.find((c) => c.type === "VOICE");
  console.log(`Sala: "${voice.name}" em "${server.name}" | ${COUNT} bots, ${SHARERS} compartilhando tela, ${MINUTES} min\n`);

  const abort = new AbortController();
  const bots = [];
  for (let n = 1; n <= COUNT; n++) {
    const acc = await account(n);
    await http(`/servers/join/${server.inviteCode}`, "POST", undefined, acc.token);
    const socket = io(API, { auth: { token: acc.token } });
    await new Promise((r) => socket.on("connect", r));
    socket.emit("server:join", server.id);
    await sleep(150);
    socket.emit("voice:join", voice.id);

    const { token, url } = await http(`/channels/${voice.id}/voice-token`, "POST", undefined, acc.token);
    const room = new Room();
    const bot = { n, name: acc.user.username, room, socket, quality: "?", talking: false, subscribed: 0, drops: 0, sharing: false };
    room.on(RoomEvent.ConnectionQualityChanged, (q, p) => { if (p.identity === room.localParticipant.identity) bot.quality = QUALITY[q] ?? "?"; });
    room.on(RoomEvent.TrackSubscribed, () => bot.subscribed++);
    room.on(RoomEvent.TrackUnsubscribed, () => bot.subscribed--);
    room.on(RoomEvent.Disconnected, () => { bot.drops++; });
    // Like a real participant who is not watching a stream: take the voices only, never decode other people's video.
    const wantTrack = (pub) => pub.kind === TrackKind.KIND_AUDIO && pub.source === TrackSource.SOURCE_MICROPHONE;
    room.on(RoomEvent.TrackPublished, (pub) => { if (wantTrack(pub)) pub.setSubscribed(true); });
    room.on(RoomEvent.ParticipantConnected, (p) => p.trackPublications.forEach((pub) => wantTrack(pub) && pub.setSubscribed(true)));
    await room.connect(url, token, { autoSubscribe: false, dynacast: true });
    room.remoteParticipants.forEach((p) => p.trackPublications.forEach((pub) => wantTrack(pub) && pub.setSubscribed(true)));

    const audio = new AudioSource(SR, 1);
    const aTrack = LocalAudioTrack.createAudioTrack(`mic-${n}`, audio);
    const aOpts = new TrackPublishOptions(); aOpts.source = TrackSource.SOURCE_MICROPHONE;
    await room.localParticipant.publishTrack(aTrack, aOpts);
    voiceLoop(audio, n, bot, abort.signal);

    if (n <= SHARERS) {
      const video = new VideoSource(W, H);
      const vTrack = LocalVideoTrack.createVideoTrack(`screen-${n}`, video);
      const vOpts = new TrackPublishOptions(); vOpts.source = TrackSource.SOURCE_SCREENSHARE;
      vOpts.simulcast = false; // one layer, like a browser sharing its screen
      vOpts.videoEncoding = new VideoEncoding({ maxBitrate: 2_000_000n, maxFramerate: FPS }); // same idea as the app's screen-share quality presets
      await room.localParticipant.publishTrack(vTrack, vOpts);
      const sAudio = new AudioSource(SR, 1);
      const sATrack = LocalAudioTrack.createAudioTrack(`screen-audio-${n}`, sAudio);
      const sAOpts = new TrackPublishOptions(); sAOpts.source = TrackSource.SOURCE_SCREENSHARE_AUDIO;
      await room.localParticipant.publishTrack(sATrack, sAOpts);
      musicLoop(sAudio, abort.signal);
      socket.emit("voice:sharing", true);
      bot.sharing = true;
      screenLoop(video, n, abort.signal, bot);
    }
    socket.on("connect", () => {   // re-announce after a server restart (presence is kept in server memory)
      socket.emit("server:join", server.id); socket.emit("voice:join", voice.id);
      if (bot.sharing) socket.emit("voice:sharing", true);
    });
    bots.push(bot);
    console.log(`  + ${bot.name} entrou${bot.sharing ? " (compartilhando tela)" : ""}`);
  }

  console.log("\nBots prontos. Entre em \"%s\" no app para participar. Ctrl+C encerra.\n", voice.name);
  const report = setInterval(() => {
    const rows = bots.map((b) => `${b.name.padEnd(5)} ${b.talking ? "🗣 falando" : "· calado "}  conexão ${b.quality.padEnd(9)} vendo ${String(b.subscribed).padStart(2)} faixas${b.sharing ? `  📺 ${(((b.frames ?? 0) - (b.lastFrames ?? 0)) / 15).toFixed(1)} fps gerados` : ""}${b.drops ? `  quedas:${b.drops}` : ""}`);
    bots.forEach((b) => { b.lastFrames = b.frames ?? 0; });
    const people = bots[0]?.room.remoteParticipants.size + 1;
    console.log(`[${new Date().toLocaleTimeString()}] ${people} pessoas na sala\n  ` + rows.join("\n  ") + "\n");
  }, 15000);

  const stop = async () => {
    clearInterval(report); abort.abort();
    for (const b of bots) { b.socket.emit("voice:sharing", false); b.socket.emit("voice:leave"); await b.room.disconnect(); b.socket.close(); }
    console.log("Bots saíram."); process.exit(0);
  };
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
  await sleep(MINUTES * 60_000); await stop();
}

main().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
