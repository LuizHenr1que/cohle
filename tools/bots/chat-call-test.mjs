// While in a voice call: chat must be usable (text channel view + side panel), the call must stay connected, and the audio menu must work.
// Needs: dev stack (api 3001, livekit), the built client on :5175 inside the desktop app on CDP port 9341.
import { io } from "socket.io-client";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); return c; };
const API = "http://localhost:3001", PORT = process.env.PORT ?? 9341;
const http = async (p, m = "GET", b, t) => { const r = await fetch(API + p, { method: m, headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(t ? { Authorization: "Bearer " + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const targets = async () => (await (await fetch(`http://localhost:${PORT}/json`)).json()).filter((t) => t.type === "page" && !t.url.includes("overlay.html"));
const t = (await targets())[0]; const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const ev = (x) => new Promise((r) => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: x, returnByValue: true, awaitPromise: true } })); }).then((r) => r.result?.value);
const click = (txt) => ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>(b.textContent||'').includes(${JSON.stringify(txt)})||(b.title||'').includes(${JSON.stringify(txt)})||(b.getAttribute('aria-label')||'').includes(${JSON.stringify(txt)}));if(b){b.click();return true}return false})()`);
const type = async (placeholderPart, text) => { await ev(`(()=>{const i=[...document.querySelectorAll('input')].find(i=>(i.placeholder||'').includes(${JSON.stringify(placeholderPart)}));i.focus()})()`); await ev(`(()=>{const i=document.activeElement;const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(i,${JSON.stringify(text)});i.dispatchEvent(new Event('input',{bubbles:true}))})()`); await ev(`document.activeElement.form.requestSubmit()`); };
const body = () => ev("document.body.innerText");

const l1 = await http("/auth/login", "POST", { email: "teste1@cohle.dev", password: "teste12345" });
const l2 = await http("/auth/login", "POST", { email: "teste2@cohle.dev", password: "teste12345" });
const srv = (await http("/servers", "GET", undefined, l2.d.token)).d.find((s) => s.name === "Servidor de Teste");
const general = srv.channels.find((c) => c.name === "geral");
const other = io(API, { auth: { token: l2.d.token } }); await new Promise((r) => other.on("connect", r)); other.emit("channel:join", general.id);
const room = () => ev(`(()=>{const r=window.__cohleRoom; return r? r.state : 'sem sala'})()`);

await ev(`localStorage.clear(); localStorage.setItem('cohle:debug','1'); localStorage.setItem('token',${JSON.stringify(l1.d.token)}); localStorage.setItem('me',${JSON.stringify(JSON.stringify(l1.d.user))}); location.reload()`); await sleep(4500);
if (!(await click("Sala de voz"))) { await click("Abrir menu"); await sleep(600); await click("Sala de voz"); } await sleep(9000);
ok("em chamada", /Conectado/.test(await body()) && (await room()) === "connected");

// 1) open a TEXT channel while in the call
ok("clicar em #geral durante a chamada", (await click("geral")) || (await click("Abrir menu") && (await sleep(500), await click("geral")))); await sleep(1500);
ok("o chat abre (campo de mensagem visível) mesmo em chamada", await ev(`!![...document.querySelectorAll('input')].find(i=>(i.placeholder||'').includes('Mensagem em #geral'))`));
ok("a chamada continua conectada enquanto escreve", (await room()) === "connected");
ok('a barra "Em voz" aparece e permite voltar', /Em voz/.test(await body()));
const m1 = "oi do chat durante a chamada " + Math.random().toString(36).slice(2, 6);
const got = new Promise((r) => other.on("message:new", (m) => m.content === m1 && r(m)));
await type("Mensagem em #geral", m1);
ok("a mensagem enviada em chamada chega para outra pessoa", !!(await Promise.race([got, sleep(5000).then(() => null)])));
ok("e aparece na minha tela", (await body()).includes(m1));

// 2) back to the call, side panel
await click("Voltar para a chamada"); await sleep(1200);
ok("voltar para a chamada mostra os quadros", await ev(`document.querySelectorAll('video').length>0 || /na sala/.test(document.body.innerText)`));
ok("o botão Chat existe no topo da chamada", await ev(`!![...document.querySelectorAll('button')].find(b=>(b.title||'').includes('Abrir o chat'))`));
const m2 = "mensagem de outra pessoa " + Math.random().toString(36).slice(2, 6);
other.emit("message:send", { channelId: general.id, content: m2 }); await sleep(1500);
ok("mensagem nova com o painel fechado mostra o aviso (bolinha)", await ev(`!![...document.querySelectorAll('button')].find(b=>(b.title||'').includes('Abrir o chat') && /\\d/.test(b.textContent||''))`));
await click("Abrir o chat"); await sleep(1500);
ok("o painel de chat abre ao lado da chamada", await ev(`!![...document.querySelectorAll('input')].find(i=>(i.placeholder||'').includes('Mensagem em #geral'))`) && (await ev("document.querySelectorAll('aside').length")) >= 1);
ok("a mensagem que chegou aparece no painel", (await body()).includes(m2));
ok("o aviso some depois de abrir", await ev(`![...document.querySelectorAll('button')].find(b=>(b.title||'').includes('Fechar o chat') && /\\d/.test((b.textContent||'').replace('Chat','')))`));
const m3 = "do painel " + Math.random().toString(36).slice(2, 6);
const got3 = new Promise((r) => other.on("message:new", (m) => m.content === m3 && r(m)));
await type("Mensagem em #geral", m3);
ok("enviar pelo painel (com os quadros da chamada visíveis) funciona", !!(await Promise.race([got3, sleep(5000).then(() => null)])));
ok("a chamada segue conectada", (await room()) === "connected");

// 3) audio menu
await click("Fechar o chat"); await sleep(500);
ok("menu de configurações de áudio abre ao lado do microfone", await click("Configurações de áudio")); await sleep(800);
const menu = await body();
const need = { microfone: /microfone/i, "supressão de ruído": /supressão de ruído/i, Forte: /Forte/, Máxima: /Máxima/, Padrão: /Padrão/, Desligada: /Desligada/ };
const missing = Object.entries(need).filter(([, re]) => !re.test(menu)).map(([k]) => k);
ok("o menu tem microfone, supressão de ruído e os 4 modos", missing.length === 0, missing.length ? "faltando: " + missing.join(", ") : "");
ok("o menu lista também o alto-falante (quando o sistema tem mais de um)", /alto-falante/i.test(menu) || (await ev(`document.querySelectorAll('[data-audio-menu] select').length`)) >= 1);
ok("o menu lista dispositivos de microfone", (await ev(`document.querySelectorAll('[data-audio-menu] select').length`)) >= 1);
const before = await ev("localStorage.getItem('cohle:noise')");
await click("Máxima"); await sleep(2500);
ok("escolher 'Máxima' salva a preferência", (await ev("localStorage.getItem('cohle:noise')")) === "gtcrn", `antes: ${before}`);
ok("a chamada segue no ar depois de trocar o motor", (await room()) === "connected" && !/Não consegui ligar a supressão/.test(await body()));
await click("Forte"); await sleep(2500); ok("voltar para 'Forte'", (await ev("localStorage.getItem('cohle:noise')")) === "rnnoise");
await ev(`document.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))`);
ok("o botão rápido liga/desliga a supressão", await click("Desligar a supressão de ruído") && (await sleep(1500), (await ev("localStorage.getItem('cohle:noise')")) === "off"));
await click("Ligar a supressão de ruído"); await sleep(2500);
ok("e liga de novo no último modo usado", (await ev("localStorage.getItem('cohle:noise')")) === "rnnoise");
await click("Sair da chamada"); other.close();
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
