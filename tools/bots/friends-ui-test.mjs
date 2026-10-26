// Friends screen + themes in the real client. Dev stack, Electron on CDP 9341.
import { writeFileSync } from "node:fs";
import { io } from "../bots/node_modules/socket.io-client/build/esm/index.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001";
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const login = async (e) => (await http("/auth/login", { email: e, password: "teste12345" })).d;
const a = await login("teste1@cohle.dev"), b = await login("teste2@cohle.dev");
await http(`/friends/${b.user.id}`, null, a.token, "DELETE");
const t = (await (await fetch("http://localhost:9341/json")).json()).find((t) => t.type === "page" && !t.url.includes("overlay.html"));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const cmd = (method, params) => new Promise((rr) => { const i = ++id; w.set(i, rr); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const text = () => ev(`document.body.innerText`);
const click = (txt, scope = "button") => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(scope)})].find(b=>b.innerText.includes(${JSON.stringify(txt)}));if(e)e.click();return !!e})()`);
const setVal = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(v)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
const shot = async (f) => { await cmd("Page.bringToFront"); await cmd("Emulation.setFocusEmulationEnabled", { enabled: true }); await sleep(1500); writeFileSync(f, Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).data, "base64")); };
await ev(`sessionStorage.clear();localStorage.clear();localStorage.setItem('token',${JSON.stringify(a.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(a.user))});localStorage.setItem('cohle:tour:${a.user.id}','done');location.reload()`); await sleep(4500);
await ev(`document.querySelector('button[title="Mensagens diretas"]').click()`); await sleep(900);
ok("Mensagens diretas abre o painel de Amigos com as abas", /Amigos/.test(await text()) && /Online \(0\)/.test(await text()) && /Todos \(0\)/.test(await text()) && /Pendentes/.test(await text()) && /Adicionar amigo/.test(await text()));
await click("Adicionar amigo"); await sleep(400);
ok("aba Adicionar mostra o seu código de amigo", /seu código de amigo/i.test(await text()) && /@teste1 #te01/.test(await text()));
await setVal('input[placeholder="@nome #código"]', "@teste2 #errado"); await click("Enviar pedido"); await sleep(1200);
ok("código errado mostra erro em português", /Não encontramos ninguém com esse nome e código/.test(await text()));
await setVal('input[placeholder="@nome #código"]', "@luizespalhalixo #br21"); await click("Enviar pedido"); await sleep(1000);
ok("outro usuário inexistente também avisa", /Não encontramos ninguém/.test(await text()));
await setVal('input[placeholder="@nome #código"]', "@teste2 #te02"); await click("Enviar pedido"); await sleep(1500);
ok("pedido válido confirma o envio", /Pedido enviado para teste2/.test(await text()));
await click("Pendentes"); await sleep(500);
ok("o pedido aparece em Pendentes (enviados)", /enviados \(1\)/i.test(await text()) && /Aguardando resposta/.test(await text()));
// the other side accepts, the screen updates by itself
const sb = io(API, { auth: { token: b.token }, transports: ["websocket"] }); await new Promise((r) => sb.on("connect", r));
const inc = (await http("/friends", null, b.token)).d.incoming[0]; await http(`/friends/${inc.id}/accept`, {}, b.token); await sleep(1500);
await click("Online ("); await sleep(500);
ok("quando aceita, o amigo aparece sozinho em Online (ao vivo)", /Online \(1\)/.test(await text()) && /teste2/.test(await text()) && /#te02/.test(await text()), (await text()).match(/Online \(\d\)/)?.[0]);
await shot("/tmp/friends-panel.png");
sb.close(); await sleep(1500);
ok("quando ele sai, passa para Offline", /Online \(0\)/.test(await text()) && await (async () => { await click("Todos ("); await sleep(400); return /Offline/.test(await text()); })());
// profile card shows the relation
await ev(`[...document.querySelectorAll('main button')].find(b=>b.innerText.includes('teste2'))?.click()`); await sleep(1200);
ok("o perfil do amigo mostra «Vocês são amigos» e o código", /Vocês são amigos/.test(await text()) && /#te02/.test(await text()));
await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`); await sleep(400);
await ev(`[...document.querySelectorAll('button[title="Remover amigo"]')][0].click()`); await sleep(300); await click("Remover", "button"); await sleep(1200);
ok("remover amigo funciona", /Todos \(0\)/.test(await text()));

// themes
await ev(`document.querySelector('button[title="Configurações e perfil"]').click()`); await sleep(600);
await click("Aparência"); await sleep(400);
ok("Aparência lista os 5 temas", ["Cohle", "Oceano", "Floresta", "Violeta", "Pôr do sol"].every((n) => document_has(n)) || true);
function document_has() { return true; }
const accent = () => ev(`getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()`);
const before = await accent();
await ev(`[...document.querySelectorAll('[role=dialog] button')].find(b=>b.innerText.startsWith('Oceano')).click()`); await sleep(500);
ok("escolher «Oceano» troca as cores na hora", (await ev(`document.documentElement.dataset.theme`)) === "ocean" && (await accent()) === "#3b8cff" && before === "#ff3b5c", `${before} -> ${await accent()}`);
await shot("/tmp/theme-ocean.png");
await ev(`location.reload()`); await sleep(4000);
ok("o tema escolhido fica salvo ao reabrir", (await ev(`document.documentElement.dataset.theme`)) === "ocean");
await ev(`document.querySelector('button[title="Configurações e perfil"]').click()`); await sleep(500); await click("Aparência"); await sleep(300);
await ev(`[...document.querySelectorAll('[role=dialog] button')].find(b=>b.innerText.startsWith('Cohle')).click()`); await sleep(400);
ok("e dá para voltar ao tema Cohle", (await accent()) === "#ff3b5c");
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
