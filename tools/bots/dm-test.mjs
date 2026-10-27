import { readFileSync } from "node:fs";
// Direct messages (server + real client) and the camera confirmation. Needs the dev stack, bots.mjs --count 2 and the Electron test app (CDP 9341, fake camera flags).
import { io } from "../bots/node_modules/socket.io-client/build/esm/index.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", PORT = 9341;
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const http = async (p, m = "GET", b, t) => { const r = await fetch(API + p, { method: m, headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(t ? { Authorization: "Bearer " + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const login = async (e) => (await http("/auth/login", "POST", { email: e, password: "teste12345" })).d;
const a = await login("teste1@cohle.dev"), b = await login("teste2@cohle.dev");
const sock = (t) => new Promise((r) => { const s = io(API, { auth: { token: t }, transports: ["websocket"] }); s.on("connect", () => r(s)); });
const send = (s, toId, content) => new Promise((r) => s.emit("dm:send", { toId, content }, r));
const tag = "t" + Date.now().toString(36);

// ---- server ----
const sa = await sock(a.token), sb = await sock(b.token);
let got = null; sb.on("dm:new", (m) => { got = m; });
const r1 = await send(sa, b.user.id, `oi ${tag}`); await sleep(400);
ok("teste1 envia, teste2 recebe em tempo real", r1.ok && got?.content === `oi ${tag}` && got.fromId === a.user.id);
let convB = (await http("/dms", "GET", undefined, b.token)).d.find((c) => c.peer.id === a.user.id);
ok("teste2 vê a conversa com 1+ não lida", !!convB && convB.unread >= 1 && convB.last.content === `oi ${tag}`, `unread=${convB?.unread}`);
await http(`/dms/${a.user.id}/read`, "POST", undefined, b.token);
convB = (await http("/dms", "GET", undefined, b.token)).d.find((c) => c.peer.id === a.user.id);
ok("marcar como lida zera o contador", convB?.unread === 0);
await send(sb, a.user.id, `resposta ${tag}`); await sleep(300);
const hist = (await http(`/dms/${b.user.id}/messages`, "GET", undefined, a.token)).d;
ok("histórico guarda as duas mensagens em ordem", hist.messages.map((m) => m.content).slice(-2).join("|") === `oi ${tag}|resposta ${tag}`);
ok("mensagens vazias/enormes são recusadas", !(await send(sa, b.user.id, "")).ok && !(await send(sa, b.user.id, "x".repeat(4001))).ok);
// stranger: a fresh account that shares no server cannot be messaged
const stEmail = `${tag}@x.dev`;
let u = (await http("/auth/register", "POST", { email: stEmail, username: `est_${tag}`.slice(0, 20), password: "estranho-12345" }));
if (u.d.needsVerification) {                                                    // accounts confirm the e-mail first (Versão 6): the dev server prints the code in its log
  let code; for (let i = 0; i < 20 && !code; i++) { code = [...readFileSync(process.env.SERVER_LOG ?? "/tmp/server.log", "utf8").matchAll(new RegExp(`to=${stEmail.replace(/[.+]/g, "\\$&")} subject="(\\d{6})`, "g"))].at(-1)?.[1]; if (!code) await sleep(300); }
  u = await http("/auth/verify", "POST", { email: stEmail, code });
}
if (u.d.token) { ok("estranho (sem servidor em comum) não recebe mensagem", !(await send(sa, u.d.user.id, "spam")).ok); }
else ok("conta de estranho criada para o teste", false, JSON.stringify(u.d));
// paging
let lastOk = -1; for (let i = 0; i < 55; i++) { const rr = await send(sa, b.user.id, `m${i} ${tag}`); if (rr.ok) lastOk = i; }          // the server limits the pace (8 per 10 s): some are refused, so check the LAST ACCEPTED one
const p1 = (await http(`/dms/${b.user.id}/messages`, "GET", undefined, a.token)).d;
const p2 = (await http(`/dms/${b.user.id}/messages?before=${p1.messages[0].id}`, "GET", undefined, a.token)).d;
// since Versão 11 only the last 15 messages of a conversation are kept (KEEP_MESSAGES): one full page, nothing older to page into
ok("histórico guarda só as últimas 15 (sem páginas anteriores)", p1.messages.length === 15 && p1.more === false, `${p1.messages.length} more=${p1.more}`);

// ---- real client ----
const t = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find((t) => t.type === "page" && !t.url.includes("overlay.html"));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const ev = (x) => new Promise((r) => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: x, returnByValue: true, awaitPromise: true } })); }).then((r) => r.result?.value);
const boot = async () => { await ev(`localStorage.clear(); localStorage.setItem('cohle:debug','1'); localStorage.setItem('token',${JSON.stringify(a.token)}); localStorage.setItem('me',${JSON.stringify(JSON.stringify(a.user))}); location.reload()`); await sleep(5000); };
await boot();
const click = (sel, txt) => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>!${JSON.stringify(txt ?? "")}||x.innerText.includes(${JSON.stringify(txt ?? "")}));if(e)e.click();return !!e})()`);
await click('button[title="Mensagens diretas"]'); await sleep(1200);
ok("abre a área de mensagens diretas com a conversa existente", await ev(`document.body.innerText.includes('Mensagens diretas') && document.body.innerText.includes('teste2')`));
await click("aside button", "teste2"); await sleep(1500);
for (let i = 0; i < 40 && !(await ev(`document.body.innerText.includes(${JSON.stringify(`m${lastOk} ${tag}`)})`)); i++) await sleep(250);          // the history comes from the database: poll
{ const has = await ev(`document.body.innerText.includes(${JSON.stringify(`m${lastOk} ${tag}`)})`); ok("histórico aparece no chat (mais recentes)", has, has ? "" : `tag=${tag} | ids na tela: ${(await ev(`document.body.innerText.match(/m\\d+ \\w+/g)?.slice(-6).join(", ")`)) ?? "nenhuma"}`); }
// send from the UI
await ev(`(()=>{const t=document.querySelector('textarea');const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;set.call(t,${JSON.stringify("da interface " + tag)});t.dispatchEvent(new Event('input',{bubbles:true}))})()`);
got = null; await ev(`document.querySelector('textarea').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`);
for (let i = 0; i < 32 && !(got && await ev(`document.body.innerText.includes(${JSON.stringify("da interface " + tag)})`)); i++) await sleep(250);          // the round trip to the dev database is slow: poll instead of a fixed wait
ok("enviar pelo chat entrega ao outro e aparece na tela", got?.content === "da interface " + tag && await ev(`document.body.innerText.includes(${JSON.stringify("da interface " + tag)})`));
// live receive + persistence after reload
await send(sb, a.user.id, `ao vivo ${tag}`); await sleep(700);
ok("mensagem do outro aparece na hora", await ev(`document.body.innerText.includes(${JSON.stringify("ao vivo " + tag)})`));
await boot(); await click('button[title="Mensagens diretas"]'); await sleep(800); await click("aside button", "teste2"); await sleep(1500);
ok("histórico continua depois de fechar e abrir o app", await ev(`document.body.innerText.includes(${JSON.stringify("ao vivo " + tag)}) && document.body.innerText.includes(${JSON.stringify("da interface " + tag)})`));
// unread badge while looking at a server
await click('nav button[title="Servidor de Teste"]'); await sleep(800);
await send(sb, a.user.id, `badge ${tag}`); await sleep(900);
const apiUnread = (await http('/dms', 'GET', undefined, a.token)).d.find((c) => c.peer.id === b.user.id)?.unread;
ok("fora das DMs o contador do botão bate com o da API", await ev(`document.querySelector('button[title="Mensagens diretas"]').innerText.trim()`) === String(apiUnread) && apiUnread >= 1, `api=${apiUnread} tela=${await ev(`document.querySelector('button[title="Mensagens diretas"]').innerText.trim()`)}`);
await click('button[title="Mensagens diretas"]'); await sleep(500); await click("aside button", "teste2");
for (let i = 0; i < 32 && (await ev(`document.querySelector('button[title="Mensagens diretas"]').innerText.trim()`)) !== ""; i++) await sleep(250);          // the read mark goes through the database: poll
ok("abrir a conversa zera o contador", await ev(`document.querySelector('button[title="Mensagens diretas"]').innerText.trim()===''`));

// ---- camera confirmation ----
await click('nav button[title="Servidor de Teste"]'); await sleep(500);
await click("aside button", "Sala de voz"); await sleep(7000);
const camOn = () => ev(`window.__cohleRoom?.localParticipant?.isCameraEnabled ?? null`);
await click('button[title="Câmera"]'); await sleep(800);
ok("clicar na câmera pergunta antes (modal)", await ev(`document.body.innerText.includes('Ligar a câmera?')`));
ok("e a câmera continua desligada enquanto não confirma", (await camOn()) !== true);
await click("button", "Cancelar"); await sleep(500);
ok("cancelar fecha sem ligar", !(await ev(`document.body.innerText.includes('Ligar a câmera?')`)) && (await camOn()) !== true);
await click('button[title="Câmera"]'); await sleep(500); await click("button", "Ligar câmera"); await sleep(3000);
ok("confirmar liga a webcam", (await camOn()) === true, `camOn=${await camOn()}`);
await click('button[title="Câmera"]'); await sleep(1000);
ok("desligar é imediato, sem perguntar", (await camOn()) === false && !(await ev(`document.body.innerText.includes('Ligar a câmera?')`)));
sa.close(); sb.close();
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
