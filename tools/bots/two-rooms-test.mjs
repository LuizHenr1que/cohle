// The same person connected to TWO voice rooms at once (two devices / a leftover session): the list must be stable, not flap. Dev stack only.
import { io } from "socket.io-client";
import { Room } from "@livekit/rtc-node";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001";
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); return c; };
const http = async (p, m = "GET", b, t) => { const r = await fetch(API + p, { method: m, headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(t ? { Authorization: "Bearer " + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const a = (await http("/auth/login", "POST", { email: "teste1@cohle.dev", password: "teste12345" })).d, b = (await http("/auth/login", "POST", { email: "teste2@cohle.dev", password: "teste12345" })).d;
const server = (await http("/servers", "GET", undefined, a.token)).d.find((s) => s.name === "Servidor de Teste");
let second = server.channels.find((c) => c.type === "VOICE" && c.name === "Sala extra");
if (!second) second = (await http(`/servers/${server.id}/channels`, "POST", { name: "Sala extra", type: "VOICE" }, a.token)).d;
const first = server.channels.find((c) => c.type === "VOICE" && c.name !== "Sala extra");
const obs = io(API, { auth: { token: a.token }, forceNew: true }); await new Promise((r) => obs.on("connect", r));
const lists = {}; const flaps = [];
obs.on("voice:snapshot", (l) => { for (const v of l) lists[v.channelId] = v.users.map((u) => u.username); });
obs.on("voice:state", (v) => { const before = JSON.stringify(lists[v.channelId] ?? []); lists[v.channelId] = v.users.map((u) => u.username); if (before !== JSON.stringify(lists[v.channelId])) flaps.push(`${v.channelId === first.id ? "1ª" : "2ª"}:${before}→${JSON.stringify(lists[v.channelId])}`); });
const join = async (ch) => { const { token, url } = (await http(`/channels/${ch.id}/voice-token`, "POST", undefined, b.token)).d; const r = new Room(); await r.connect(url, token, { autoSubscribe: false }); return r; };

const r1 = await join(first); await sleep(7000);
ok("entrou na 1ª sala: listado nela", (lists[first.id] ?? []).includes("teste2"));
const r2 = await join(second);                                   // same account, second room: LiveKit allows it in different rooms
await sleep(1500); flaps.length = 0; await sleep(32000);          // 6 reconcile passes with the person in BOTH rooms
const inFirst = (lists[first.id] ?? []).includes("teste2"), inSecond = (lists[second.id] ?? []).includes("teste2");
ok("com a pessoa nas duas salas, a lista NÃO fica piscando", flaps.length === 0, flaps.length ? flaps.join(" | ") : "nenhuma mudança em 32 s");
ok("ela aparece em exatamente UMA sala (modelo de uma sala por pessoa)", inFirst !== inSecond, `1ª: ${inFirst} | 2ª: ${inSecond}`);
const where = inFirst ? "1ª" : "2ª"; const roomToLeave = inFirst ? r1 : r2, other = inFirst ? second : first;
await roomToLeave.disconnect(); const t0 = Date.now();
let moved = false; for (let i = 0; i < 40 && !moved; i++) { await sleep(500); moved = (lists[other.id] ?? []).includes("teste2") && !(lists[inFirst ? first.id : second.id] ?? []).includes("teste2"); }
ok(`saiu da ${where} sala e a lista passa para a outra, onde ela continua`, moved, `em ${((Date.now() - t0) / 1000).toFixed(1)} s`);
await (inFirst ? r2 : r1).disconnect(); obs.close();
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
