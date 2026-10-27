// Empty states: no server (cards, invite by code), server without a channel selected. Dev server with EMAIL_DEV=1, Electron on CDP 9341.
import { readFileSync, writeFileSync } from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001";
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok) => { const r = await fetch(API + p, { method: b ? "POST" : "GET", headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const t = (await (await fetch("http://localhost:9341/json")).json()).find((t) => t.type === "page" && !t.url.includes("overlay.html"));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const cmd = (method, params) => new Promise((r) => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const text = () => ev(`document.body.innerText`);
const shot = async (f) => { await cmd("Page.bringToFront"); await cmd("Emulation.setFocusEmulationEnabled", { enabled: true }); await sleep(1800); const s = await cmd("Page.captureScreenshot", { format: "png" }); writeFileSync(f, Buffer.from(s.data, "base64")); };
const setVal = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(v)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
const click = (txt) => ev(`(()=>{const e=[...document.querySelectorAll('button')].find(b=>b.innerText.includes(${JSON.stringify(txt)}));if(e)e.click();return !!e})()`);
const login = async (tok, user) => { await ev(`sessionStorage.clear();localStorage.clear();localStorage.setItem('token',${JSON.stringify(tok)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(user))});localStorage.setItem('cohle:tour:${user.id}','done');location.reload()`); await sleep(4000); };
// a brand-new account (confirmed through the dev log code)
const tag = Date.now().toString(36), email = `vazio_${tag}@exemplo.dev`;
await http("/auth/register", { email, username: `vazio_${tag}`.slice(0, 20), password: "senha-forte-1" });
const code = [...readFileSync((process.env.SERVER_LOG ?? "/tmp/server.log"), "utf8").matchAll(new RegExp(`to=${email.replace(/[.+]/g, "\\$&")} subject="(\\d{6})`, "g"))].at(-1)[1];
const me = (await http("/auth/verify", { email, code })).d;
await login(me.token, me.user);
ok("sem servidor: aparece a tela de boas-vindas (não mais em branco)", /Bem-vindo ao Cohle/.test(await text()) && /Criar o meu servidor/.test(await text()) && /Entrar com um convite/.test(await text()));
ok("mostra os recursos e o tour", /Salas de voz leves/.test(await text()) && /Ver o tour de boas-vindas/.test(await text()));
ok("a lateral explica «Nenhum servidor ainda» com botões", /Nenhum servidor ainda/.test(await text()));
await shot("/tmp/empty-noserver.png");
await cmd("Emulation.setDeviceMetricsOverride", { width: 430, height: 880, deviceScaleFactor: 2, mobile: false }); await sleep(800);
ok("em tela estreita aparece o botão de menu", await ev(`!!document.querySelector('button[aria-label="Abrir menu"]')`));
await shot("/tmp/empty-mobile.png"); await cmd("Emulation.clearDeviceMetricsOverride"); await sleep(500);
await click("Criar servidor"); await sleep(600);
ok("«Criar servidor» abre o assistente", /Criar|modelo|servidor/i.test(await text()) && await ev(`!!document.querySelector('.fixed.inset-0')`));
await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`); await sleep(400);
await setVal('input[placeholder^="Cole o código"]', "codigo-invalido"); await click("Entrar no servidor"); await sleep(1500);
ok("convite inválido mostra erro (sem travar)", /Não foi possível|inválid|não encontr|forbidden|erro/i.test(await text()), (await text()).match(/(Não foi possível|inválid|erro)[^\n]*/i)?.[0]);
// join with a real code pasted as a link
const a = (await http("/auth/login", { email: "teste1@cohle.dev", password: "teste12345" })).d;
// a server whose text channels were all deleted: the "choose a channel" screen
const vazio = (await http("/servers", { name: "Servidor Vazio " + tag, template: "custom" }, a.token)).d;
for (const c of vazio.channels.filter((c) => c.type === "TEXT")) await fetch(API + "/channels/" + c.id, { method: "DELETE", headers: { Authorization: "Bearer " + a.token } });
const inv = vazio.inviteCode;
await setVal('input[placeholder^="Cole o código"]', `https://cohle.verticeapp.com.br/convite/${inv}`); await click("Entrar no servidor"); await sleep(3000);
ok("colar o link do convite entra no servidor", new RegExp("Servidor Vazio").test(await text()));
ok("servidor aberto sem canal: tela com os canais e convidar", /Escolha um canal para começar/.test(await text()) && /Convidar pessoas/.test(await text()) && /Nenhum canal ainda/.test(await text()) && /Sala de voz/.test(await text()));
await shot("/tmp/empty-nochannel.png");
await click("Sala de voz"); await sleep(2500);
ok("clicar numa sala de voz da tela entra na chamada", await ev(`/Conectado|Conectando/.test(document.body.innerText)`));
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
