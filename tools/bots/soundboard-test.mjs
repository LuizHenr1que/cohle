// Soundboard: a sound triggered by anyone in the call plays for everyone (real client + second account over the socket). Needs the dev stack and the Electron test app (CDP 9341).
import { io } from "../bots/node_modules/socket.io-client/build/esm/index.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", PORT = 9341;
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const http = async (p, m = "GET", b, t) => { const r = await fetch(API + p, { method: m, headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(t ? { Authorization: "Bearer " + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const login = async (e) => (await http("/auth/login", "POST", { email: e, password: "teste12345" })).d;
const a = await login("teste1@cohle.dev"), b = await login("teste2@cohle.dev");
const voiceCh = (await http("/servers", "GET", undefined, a.token)).d.find((s) => s.name === "Servidor de Teste").channels.find((c) => c.type === "VOICE");
const t = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find((t) => t.type === "page" && !t.url.includes("overlay.html"));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const cmd = (method, params) => new Promise((r) => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
await cmd("Page.enable");
// count oscillators/noise sources created = proof that a sound was actually synthesized
await cmd("Page.addScriptToEvaluateOnNewDocument", { source: `window.__osc=0;const o=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){window.__osc++;return o.apply(this,arguments)};` });
await ev(`localStorage.clear(); localStorage.setItem('token',${JSON.stringify(a.token)}); localStorage.setItem('me',${JSON.stringify(JSON.stringify(a.user))}); location.reload()`); await sleep(5000);
const click = (sel, txt) => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>!${JSON.stringify(txt ?? "")}||x.innerText.includes(${JSON.stringify(txt ?? "")}));if(e)e.click();return !!e})()`);
const osc = () => ev(`window.__osc`);
const toast = () => ev(`[...document.querySelectorAll('main div')].map(d=>d.innerText).find(t=>/tocou/.test(t||'')&&t.length<60)||null`);

const s2 = io(API, { auth: { token: b.token }, transports: ["websocket"] }); await new Promise((r) => s2.on("connect", r));
s2.emit("voice:sound", "scare"); await sleep(600);
ok("quem não está em chamada não dispara nada", (await osc()) === 0 && !(await toast()));

await click("aside button", "Sala de voz"); await sleep(7000);
s2.emit("voice:join", voiceCh.id); await sleep(1500);
const before = await osc();
s2.emit("voice:sound", "scare"); await sleep(900);
ok("susto do teste2 toca para o teste1 (sons sintetizados)", (await osc()) > before, `osciladores ${before} -> ${await osc()}`);
ok("aparece quem tocou", /teste2 tocou Susto/.test((await toast()) ?? ""), await toast());
s2.emit("voice:sound", "fireworks"); await sleep(600);
ok("segundo som dentro de 2,5 s é barrado (anti-spam)", !/Fogos/.test((await toast()) ?? ""));
await sleep(2200);

// from the panel
await click('button[title="Sons para a sala"]'); await sleep(400);
ok("painel lista os 5 sons", await ev(`['Susto','Fogos','Risos','Chamando','Tatakae'].every(n=>document.body.innerText.includes(n))`));
const b2 = await osc();
await click("button", "Fogos"); await sleep(900);
ok("clicar em Fogos toca para mim também", (await osc()) > b2 && /teste1 tocou Fogos/.test((await toast()) ?? ""), await toast());
await sleep(2800);
const tt = await ev(`(()=>{const l=speechSynthesis;window.__said=[];const sp=l.speak.bind(l);l.speak=u=>{window.__said.push(u.text);return sp(u)};return true})()`);
await click("button", "Tatakae"); await sleep(1800);
ok("Tatakae fala a frase com a voz do sistema", (await ev(`window.__said`)).some((x) => /Tatakae/.test(x)), JSON.stringify(await ev(`window.__said`)));
await sleep(2000);
// deafened: hears nothing
await click('button[title="Ensurdecer"]'); await sleep(800);
const b3 = await osc(); s2.emit("voice:sound", "laugh"); await sleep(900);
ok("ensurdecido não ouve os sons dos outros", (await osc()) === b3, `${b3} -> ${await osc()}`);
s2.emit("voice:leave"); s2.close();
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
