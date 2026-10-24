// Voice presence must follow LiveKit (the truth), not only the apps' own messages. Dev stack: api 3001 + livekit 7880.
import { io } from "socket.io-client";
import { Room } from "@livekit/rtc-node";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001";
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); return c; };
const http = async (p, m = "GET", b, t) => { const r = await fetch(API + p, { method: m, headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(t ? { Authorization: "Bearer " + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const login = async (n) => (await http("/auth/login", "POST", { email: `teste${n}@cohle.dev`, password: "teste12345" })).d;
const a = await login(1), b = await login(2);
const voiceCh = (await http("/servers", "GET", undefined, a.token)).d.find((s) => s.name === "Servidor de Teste").channels.find((c) => c.type === "VOICE");
const sock = async (who) => { const s = io(API, { auth: { token: who.token }, forceNew: true }); await new Promise((r) => s.on("connect", r)); return s; };
const lk = async (who) => { const { token, url } = (await http(`/channels/${voiceCh.id}/voice-token`, "POST", undefined, who.token)).d; const r = new Room(); await r.connect(url, token, { autoSubscribe: false }); return r; };

// observer = teste1 (a member who is NOT in the call), tracks what the sidebar would show
const obs = await sock(a); obs.emit("channel:join", voiceCh.id);
let shown = []; obs.on("voice:state", (v) => { if (v.channelId === voiceCh.id) shown = v.users.map((u) => u.username); });
obs.on("voice:snapshot", (l) => { const v = l.find((x) => x.channelId === voiceCh.id); shown = v ? v.users.map((u) => u.username) : []; });
const waitFor = async (pred, ms) => { for (let t = 0; t < ms; t += 500) { if (pred()) return true; await sleep(500); } return pred(); };
await sleep(1500);
ok("ponto de partida: sala vazia", shown.length === 0, JSON.stringify(shown));

// A) in LiveKit but the app never told the server (restart/lost message)
const lkB = await lk(b); const t0 = Date.now();
ok("A) quem está no LiveKit aparece SEM ter avisado o servidor", await waitFor(() => shown.includes("teste2"), 12000), `em ${((Date.now() - t0) / 1000).toFixed(1)} s`);

// E) someone who connects later sees them right away in the snapshot
const late = await sock(a); let lateSeen = []; late.on("voice:snapshot", (l) => { const v = l.find((x) => x.channelId === voiceCh.id); lateSeen = v ? v.users.map((u) => u.username) : []; }); await sleep(1500);
ok("E) quem entra no app depois já vê quem está na sala", lateSeen.includes("teste2"), JSON.stringify(lateSeen)); late.close();

// C) chat socket blips while the call stays up: must NOT disappear
const sB = await sock(b); sB.emit("server:join", voiceCh.serverId); sB.emit("voice:join", voiceCh.id); await sleep(1000); sB.close(); await sleep(14000);
ok("C) a conexão do chat caiu, mas a chamada segue: continua listado", shown.includes("teste2"), JSON.stringify(shown));

// D) really leaves LiveKit
await lkB.disconnect(); const t1 = Date.now();
ok("D) saiu de verdade da chamada: some da lista", await waitFor(() => !shown.includes("teste2"), 20000), `em ${((Date.now() - t1) / 1000).toFixed(1)} s`);

// F) the app announces "voice:join" the very instant it connects (what really happens after a reconnect): it must not be lost
const eager = io(API, { auth: { token: b.token }, forceNew: true }); eager.on("connect", () => { eager.emit("server:join", voiceCh.serverId); eager.emit("voice:join", voiceCh.id); });
const lkB2 = await lk(b); const t3 = Date.now();
ok("F) aviso enviado no instante da conexão não se perde", await waitFor(() => shown.includes("teste2"), 8000), `em ${((Date.now() - t3) / 1000).toFixed(1)} s`);
await lkB2.disconnect(); eager.emit("voice:leave"); eager.close(); await waitFor(() => !shown.includes("teste2"), 15000);

// B) ghost: says it joined but never connects to LiveKit
const sG = await sock(b); sG.emit("server:join", voiceCh.serverId); sG.emit("voice:join", voiceCh.id); const t2 = Date.now();
ok("B) aviso fantasma aparece de início (margem para conectar)", await waitFor(() => shown.includes("teste2"), 6000));
ok("B) e some sozinho se nunca entrar no LiveKit", await waitFor(() => !shown.includes("teste2"), 45000), `em ${((Date.now() - t2) / 1000).toFixed(1)} s`);
sG.close(); obs.close();
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
