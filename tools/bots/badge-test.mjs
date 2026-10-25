// "Desenvolvedor" badge: granted only to the confirmed team e-mail, shown across the UI. Dev server with EMAIL_DEV=1, Electron on CDP 9341.
import { readFileSync, writeFileSync } from "node:fs";
import { io } from "../bots/node_modules/socket.io-client/build/esm/index.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001";
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const codeFor = (to) => [...readFileSync("/tmp/server.log", "utf8").matchAll(new RegExp(`to=${to.replace(/[.+]/g, "\\$&")} subject="(\\d{6})`, "g"))].at(-1)?.[1];
const DEV = "verticeappempresa@gmail.com", tag = Date.now().toString(36);
// the team account (wipe a previous local one so the test is repeatable)
let r = await http("/auth/register", { email: DEV, username: "verticeapps", password: "senha-forte-1" });
if (r.s === 409) { r = await http("/auth/login", { email: DEV, password: "senha-forte-1" }); }
let dev;
if (r.d.needsVerification || r.s === 403) { ok("antes de confirmar o e-mail não há selo nem login", r.s === 403 || r.d.needsVerification === true); await http("/auth/resend", { email: DEV }); await sleep(300); dev = (await http("/auth/verify", { email: DEV, code: codeFor(DEV) })).d; }
else dev = r.d;
ok("ao confirmar, a conta da empresa recebe o selo DEV", dev.user?.badge === "DEV", JSON.stringify(dev.user));
const e2 = `comum_${tag}@exemplo.dev`; await http("/auth/register", { email: e2, username: `comum_${tag}`.slice(0, 20), password: "senha-forte-1" });
const other = (await http("/auth/verify", { email: e2, code: codeFor(e2) })).d;
ok("conta comum não recebe selo", !other.user?.badge);
const me = (await http("/me", null, dev.token)).d; ok("/me da conta da empresa traz o selo", me.badge === "DEV");
// somebody imitating the e-mail with different casing is the same account; a lookalike address gets nothing
const e3 = `verticeappempresa+x${tag}@gmail.com`; await http("/auth/register", { email: e3, username: `fake_${tag}`.slice(0, 20), password: "senha-forte-1" });
const fake = (await http("/auth/verify", { email: e3, code: codeFor(e3) })).d;
ok("endereço parecido (outro e-mail) não recebe selo", !fake.user?.badge);
// message in a server
const a = (await http("/auth/login", { email: "teste1@cohle.dev", password: "teste12345" })).d;
const srv = (await http("/servers", null, a.token)).d.find((s) => s.name === "Servidor de Teste");
await http(`/servers/join/${srv.inviteCode}`, {}, dev.token);
const ch = srv.channels.find((c) => c.type === "TEXT");
const s = io(API, { auth: { token: dev.token }, transports: ["websocket"] }); await new Promise((r) => s.on("connect", r)); await sleep(500);
await new Promise((r) => s.emit("message:send", { channelId: ch.id, content: "Olá, aqui é o time do Cohle." }, r)); await sleep(500);
const msgs = (await http(`/channels/${ch.id}/messages`, null, a.token)).d;
ok("a mensagem da conta da empresa traz o selo no autor", msgs.at(-1)?.author?.badge === "DEV" && !msgs.find((m) => m.author.username === "teste1")?.author.badge);
// UI
const t = (await (await fetch("http://localhost:9341/json")).json()).find((t) => t.type === "page" && !t.url.includes("overlay.html"));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const cmd = (method, params) => new Promise((rr) => { const i = ++id; w.set(i, rr); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((rr) => rr.result?.value);
await ev(`sessionStorage.clear();localStorage.clear();localStorage.setItem('token',${JSON.stringify(a.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(a.user))});localStorage.setItem('cohle:tour:${a.user.id}','done');location.reload()`); await sleep(4500);
await ev(`[...document.querySelectorAll('aside button')].find(b=>b.innerText.includes('geral'))?.click()`); await sleep(1500);
ok("no chat o selo «Dev» aparece ao lado do nome", await ev(`!!document.querySelector('main [aria-label="Desenvolvedor do Cohle"]')`));
await cmd("Page.bringToFront"); await cmd("Emulation.setFocusEmulationEnabled", { enabled: true }); await sleep(1200);
writeFileSync("/tmp/badge-chat.png", Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).data, "base64"));
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
