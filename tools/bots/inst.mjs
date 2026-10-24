import { io } from "socket.io-client";
import { Room } from "@livekit/rtc-node";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "https://cohle-api.onrender.com";
const http = async (p, m = "GET", b, t) => { const r = await fetch(API + p, { method: m, headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(t ? { Authorization: "Bearer " + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const a = (await http("/auth/login", "POST", { email: "teste1@cohle.dev", password: process.env.T1_PW })).d, b = (await http("/auth/login", "POST", { email: "teste2@cohle.dev", password: process.env.T2_PW })).d;
const voiceCh = (await http("/servers", "GET", undefined, a.token)).d.find((s) => s.name === "Servidor de Teste").channels.find((c) => c.type === "VOICE");
const { token, url } = (await http(`/channels/${voiceCh.id}/voice-token`, "POST", undefined, b.token)).d;
const room = new Room(); await room.connect(url, token, { autoSubscribe: false }); await sleep(6000);
for (let i = 1; i <= 8; i++) {
  const s = io(API, { auth: { token: a.token }, forceNew: true });
  const got = await new Promise((res) => { s.on("voice:snapshot", (l) => { const v = l.find((x) => x.channelId === voiceCh.id); res(v ? v.users.map((u) => u.username).join(",") : "(vazia)"); }); setTimeout(() => res("sem resposta"), 6000); });
  console.log(`conexão ${i}: transporte=${s.io.engine?.transport?.name} | snapshot: ${got}`); s.close(); await sleep(1200);
}
await room.disconnect(); process.exit(0);
