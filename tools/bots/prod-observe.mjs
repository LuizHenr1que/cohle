// READ-ONLY look at production: does the server's voice list match LiveKit Cloud, and is it stable? Never joins a room.
import { io } from "socket.io-client";
import { RoomServiceClient } from "livekit-server-sdk";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "https://cohle-api.onrender.com";
const http = async (p, m = "GET", b, t) => { const r = await fetch(API + p, { method: m, headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(t ? { Authorization: "Bearer " + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const a = (await http("/auth/login", "POST", { email: process.env.OBS_EMAIL ?? "teste1@cohle.dev", password: process.env.OBS_PW })).d;
const servers = (await http("/servers", "GET", undefined, a.token)).d; const names = new Map(servers.flatMap((s) => s.channels.map((c) => [c.id, `${s.name} / ${c.name}`])));
const svc = new RoomServiceClient(process.env.LK_HTTP, process.env.LK_KEY, process.env.LK_SECRET);
const sock = io(API, { auth: { token: a.token }, forceNew: true }); let list = {}, changes = 0;
sock.on("voice:snapshot", (l) => { list = Object.fromEntries(l.map((v) => [v.channelId, v.users.map((u) => u.username).sort().join(", ")])); });
sock.on("voice:state", (v) => { const before = list[v.channelId] ?? ""; list[v.channelId] = v.users.map((u) => u.username).sort().join(", "); if (before !== list[v.channelId]) { changes++; console.log(`   mudança: ${names.get(v.channelId) ?? v.channelId.slice(0, 6)}: [${before}] -> [${list[v.channelId]}]`); } });
await new Promise((r) => sock.on("connect", r)); await sleep(2000);
for (let i = 0; i < 6; i++) {
  const truth = {}; for (const r of await svc.listRooms()) truth[r.name] = (await svc.listParticipants(r.name)).map((p) => p.name).sort().join(", ");
  const ids = new Set([...Object.keys(truth), ...Object.keys(list)]);
  console.log(`t+${String(i * 7).padStart(2)}s ` + ([...ids].map((c) => `${names.get(c) ?? c.slice(0, 6)}: LiveKit [${truth[c] ?? ""}] | lista [${list[c] ?? ""}] ${(truth[c] ?? "") === (list[c] ?? "") ? "= igual" : "≠ DIFERENTE"}`).join("  ||  ") || "nenhuma sala ativa"));
  await sleep(7000);
}
console.log(`mudanças na lista durante a observação: ${changes}`); sock.close(); process.exit(0);
