import { io } from "socket.io-client";
import { Room } from "@livekit/rtc-node";
import { RoomServiceClient } from "livekit-server-sdk";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "https://cohle-api.onrender.com";
const http = async (p, m = "GET", b, t) => { const r = await fetch(API + p, { method: m, headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(t ? { Authorization: "Bearer " + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const a = (await http("/auth/login", "POST", { email: "teste1@cohle.dev", password: process.env.T1_PW })).d, b = (await http("/auth/login", "POST", { email: "teste2@cohle.dev", password: process.env.T2_PW })).d;
const voiceCh = (await http("/servers", "GET", undefined, a.token)).d.find((s) => s.name === "Servidor de Teste").channels.find((c) => c.type === "VOICE");
const svc = new RoomServiceClient(process.env.LK_HTTP, process.env.LK_KEY, process.env.LK_SECRET);
const obs = io(API, { auth: { token: a.token }, forceNew: true }); await new Promise((r) => obs.on("connect", r)); let shown = [];
obs.on("voice:state", (v) => { if (v.channelId === voiceCh.id) shown = v.users.map((u) => u.username); }); obs.on("voice:snapshot", (l) => { const v = l.find((x) => x.channelId === voiceCh.id); shown = v ? v.users.map((u) => u.username) : []; });
const { token, url } = (await http(`/channels/${voiceCh.id}/voice-token`, "POST", undefined, b.token)).d;
const room = new Room(); room.on("disconnected", (r) => console.log("   [cliente LiveKit] desconectado, motivo:", r)); await room.connect(url, token, { autoSubscribe: false });
const t0 = Date.now();
for (let i = 0; i < 9; i++) {
  const ps = await svc.listParticipants(voiceCh.id).catch((e) => ["erro:" + e.message]);
  console.log(`t+${String(Math.round((Date.now() - t0) / 1000)).padStart(2)}s  LiveKit Cloud: [${ps.map((p) => p.name ?? p).join(", ")}] | servidor lista: [${shown.join(", ")}] | cliente conectado: ${room.isConnected}`);
  await sleep(5000);
}
await room.disconnect(); obs.close(); process.exit(0);
