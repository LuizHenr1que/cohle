// Smoke test of a deployed Cohle server:  node smoke.mjs https://cohle-api.onrender.com
// Creates one throw-away account + server, joins its voice room on LiveKit, then deletes the server.
import { Room } from "@livekit/rtc-node";

const API = (process.argv[2] ?? "http://localhost:3001").replace(/\/$/, "");
let pass = 0, fail = 0;
const ok = (label, cond, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  — " + extra : ""}`); return cond; };
const http = async (path, method = "GET", body, token) => {
  const t0 = performance.now();
  const r = await fetch(API + path, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => ({})), ms: Math.round(performance.now() - t0) };
};

const h = await http("/health");
ok("servidor responde (pode demorar ~1 min se estava dormindo)", h.s === 200 && h.d.ok, `${h.ms} ms`);
if (h.s !== 200) process.exit(1);

const id = Math.random().toString(36).slice(2, 8);
const pw = "Smoke-" + Math.random().toString(36).slice(2, 12);
const reg = await http("/auth/register", "POST", { email: `smoke-${id}@cohle.dev`, username: `smoke_${id}`, password: pw });
ok("cadastro funciona (banco Neon gravando)", reg.s === 200 && !!reg.d.token, `${reg.ms} ms`);
const login = await http("/auth/login", "POST", { email: `smoke-${id}@cohle.dev`, password: pw });
ok("login funciona", login.s === 200);
const t = login.d.token;

ok("contas de teste (teste1) NÃO existem em produção", (await http("/auth/login", "POST", { email: "teste1@cohle.dev", password: "teste12345" })).s === 401);

const srv = await http("/servers", "POST", { name: "Teste de deploy", template: "custom" }, t);
ok("cria servidor com canais", srv.s === 200 && srv.d.channels?.length === 2);
const voice = srv.d.channels.find((c) => c.type === "VOICE");
const text = srv.d.channels.find((c) => c.type === "TEXT");
const msgs = await http(`/channels/${text.id}/messages`, "GET", undefined, t);
ok("lê mensagens do canal", msgs.s === 200 && Array.isArray(msgs.d));

const vt = await http(`/channels/${voice.id}/voice-token`, "POST", undefined, t);
const claims = vt.d.token ? JSON.parse(Buffer.from(vt.d.token.split(".")[1], "base64url").toString()) : {};
ok("token de voz emitido para o LiveKit Cloud", vt.s === 200 && /^wss:\/\/.+\.livekit\.cloud$/.test(vt.d.url ?? ""), `${vt.d.url} · chave ${String(claims.iss).slice(0, 7)}…`);

const room = new Room();
let connected = false;
try { await room.connect(vt.d.url, vt.d.token, { autoSubscribe: false }); connected = true; } catch (e) { console.log("   erro LiveKit:", e.message); }
ok("conecta na sala de voz do LiveKit Cloud", connected && room.isConnected, connected ? `sala ${room.name?.slice(0, 8)}…` : "");
if (connected) await room.disconnect();

const bad = [];
for (let i = 0; i < 12; i++) bad.push((await http("/auth/login", "POST", { email: "x@x.com", password: "errada123" })).s);
ok("bloqueia força bruta (HTTP 429 depois de 10 erros)", bad.includes(429), bad.join(" "));

const del = await http(`/servers/${srv.d.id}`, "DELETE", undefined, t);
ok("remove o servidor de teste", del.s === 200);
console.log(`\n${pass} passaram, ${fail} falharam`);
console.log(`(sobrou 1 conta de teste: smoke_${id})`);
process.exit(fail ? 1 : 0);
