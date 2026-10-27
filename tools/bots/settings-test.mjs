// Needs the dev API started with DEV_EMAILS=teste1@cohle.dev (the DEV badge is granted by e-mail) besides the usual OWNER_EMAILS/EMAIL_DEV.
// Settings screen, profile cards, and the badge for already-signed-in users. Dev stack (EMAIL_DEV=1), Electron on CDP 9341.
import { readFileSync, writeFileSync } from "node:fs";
import { io } from "../bots/node_modules/socket.io-client/build/esm/index.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001";
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
// 1) the owner account (teste1 is in OWNER_EMAILS on the dev server) gets the DEV badge from /me, also when it was already signed in
const login = (await http("/auth/login", { email: "teste1@cohle.dev", password: "teste12345" })).d;
const me = (await http("/me", null, login.token)).d;
ok("quem já estava logado recebe o selo ao abrir o app (/me)", me.badge === "DEV", `badge=${me.badge}`);
// 2) account endpoints
const acc = (await http("/me/account", null, login.token)).d;
ok("/me/account devolve e-mail, data e confirmação", acc.email === "teste1@cohle.dev" && acc.emailVerified === true && !!acc.createdAt, JSON.stringify(acc).slice(0, 120));
const a = (await http("/auth/login", { email: "teste2@cohle.dev", password: "teste12345" })).d;          // the other person who looks at the DEV account
const bad = await http("/me/password", { current: "errada-123456", password: "nova-senha-123" }, a.token);
ok("trocar senha com a atual errada é recusado", bad.s === 401);
const tag = Date.now().toString(36), e = `cfg_${tag}@exemplo.dev`;
await http("/auth/register", { email: e, username: `cfg_${tag}`.slice(0, 20), password: "senha-forte-1" });
const code = [...readFileSync((process.env.SERVER_LOG ?? "/tmp/server.log"), "utf8").matchAll(new RegExp(`to=${e.replace(/[.+]/g, "\\$&")} subject="(\\d{6})`, "g"))].at(-1)[1];
const u = (await http("/auth/verify", { email: e, code })).d;
ok("trocar senha com a atual certa funciona", (await http("/me/password", { current: "senha-forte-1", password: "nova-senha-777" }, u.token)).s === 200 && (await http("/auth/login", { email: e, password: "nova-senha-777" })).s === 200 && (await http("/auth/login", { email: e, password: "senha-forte-1" })).s === 401);
const prof = await http(`/users/${login.user.id}/profile`, null, a.token);
ok("perfil de outra pessoa mostra selo e servidores em comum", prof.s === 200 && prof.d.user.badge === "DEV" && prof.d.mutual.some((m) => m.name === "Servidor de Teste") && !prof.d.isSelf);
ok("perfil de quem não divide servidor é recusado", (await http(`/users/${login.user.id}/profile`, null, u.token)).s === 403);

// 3) UI
const t = (await (await fetch("http://localhost:9341/json")).json()).find((t) => t.type === "page" && !t.url.includes("overlay.html"));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (ev) => { const m = JSON.parse(ev.data); w.get(m.id)?.(m.result); };
const cmd = (method, params) => new Promise((rr) => { const i = ++id; w.set(i, rr); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const text = () => ev(`document.body.innerText`);
const click = (txt, scope = "button") => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(scope)})].find(b=>b.innerText.includes(${JSON.stringify(txt)}));if(e)e.click();return !!e})()`);
const shot = async (f) => { await cmd("Page.bringToFront"); await cmd("Emulation.setFocusEmulationEnabled", { enabled: true }); await sleep(1500); writeFileSync(f, Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).data, "base64")); };
await ev(`sessionStorage.clear();localStorage.clear();localStorage.setItem('token',${JSON.stringify(login.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(me))});localStorage.setItem('cohle:tour:${me.id}','done');location.reload()`); await sleep(4500);
ok("o selo DEV aparece no cartão do usuário (canto inferior)", await ev(`!!document.querySelector('button[title="Configurações e perfil"] [aria-label="Desenvolvedor do Cohle"]')`));
await ev(`document.querySelector('button[title="Configurações e perfil"]').click()`); await sleep(700);
ok("clicar no nome/engrenagem abre as Configurações", /Minha conta/.test(await text()) && /Senha e segurança/.test(await text()) && /Aparência/.test(await text()) && /Áudio e sons/.test(await text()) && /Aplicativo/.test(await text()) && /Sobre/.test(await text()));
ok("Minha conta mostra e-mail, selo e botão de editar", /teste1@cohle.dev/.test(await text()) && /Editar foto e nome/.test(await text()) && await ev(`!!document.querySelector('[role=dialog][aria-label="Configurações"] [aria-label="Desenvolvedor do Cohle"]')`));
await shot("/tmp/settings-account.png");
await click("Aparência"); await sleep(300);
await ev(`document.querySelectorAll('[role=dialog] [role=switch]')[1].click()`); await sleep(400);
ok("Modo leve liga na hora (classe lite)", await ev(`document.documentElement.classList.contains('lite')`));
await ev(`document.querySelectorAll('[role=dialog] [role=switch]')[1].click()`); await sleep(300);
await click("Áudio e sons"); await sleep(300);
await click("Máxima"); await sleep(300);
ok("supressão de ruído padrão fica salva", await ev(`/gtcrn/.test(localStorage.getItem('cohle:noise')||JSON.stringify(Object.entries(localStorage)))`));
await click("Forte (recomendado)"); await sleep(200);
await click("Aplicativo"); await sleep(600);
ok("aba Aplicativo mostra fechar-para-bandeja e atualizações", /Manter em segundo plano ao fechar/.test(await text()) && /Verificar agora/.test(await text()));
await ev(`[...document.querySelectorAll('[role=dialog] [role=switch]')].at(-1).click()`); await sleep(500);
ok("a opção «manter em segundo plano» é gravada pelo app", (await ev(`window.cohle.getSettings().then(s=>s.closeToTray)`)) === false);
await ev(`window.cohle.setSettings({closeToTray:true})`);
await click("Senha e segurança"); await sleep(300);
ok("aba de senha tem os três campos", await ev(`document.querySelectorAll('[role=dialog] input[type=password]').length`) === 3);
await click("Sobre"); await sleep(300);
ok("Sobre mostra a versão e as novidades", /Versão \d+/.test(await text()) && /Novidades desta versão/.test(await text()));
await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`); await sleep(400);
ok("Esc fecha as configurações", await ev(`!document.querySelector('[role=dialog][aria-label="Configurações"]')`));

// profile card from the chat: each of the two accounts says something in #geral, so both names are on screen
{ const srv = (await http("/servers", null, login.token)).d.find((x) => x.name === "Servidor de Teste"), ch = srv.channels.find((c) => c.type === "TEXT").id;
  for (const [who, txt] of [[a, "oi do settings-test (teste2)"], [login, "oi do settings-test (teste1)"]]) { const sk = io(API, { auth: { token: who.token }, transports: ["websocket"] }); await new Promise((r) => sk.on("connect", r)); sk.emit("channel:join", ch); await sleep(500); sk.emit("message:send", { channelId: ch, content: txt }, () => {}); await sleep(900); sk.close(); } }
await ev(`[...document.querySelectorAll('nav button')].find(b=>b.getAttribute('title')==='Servidor de Teste')?.click()`); await sleep(1200);          // since Versão 12 the app opens on the welcome screen: pick the server first
await ev(`[...document.querySelectorAll('aside button')].find(b=>b.innerText.includes('geral'))?.click()`); await sleep(1800);
for (let i = 0; i < 40 && !(await ev(`[...document.querySelectorAll('main button')].some(b=>b.innerText.trim()==='teste2')`)); i++) await sleep(250);          // wait for the history to be on screen
await ev(`[...document.querySelectorAll('main button')].find(b=>b.innerText.trim()==='teste2')?.click()`);
for (let i = 0; i < 32 && !/membro desde/i.test(await text()); i++) await sleep(250);          // the card loads the profile from the server
{ const dlg = await ev(`!!document.querySelector('[role=dialog][aria-label="Perfil"]')`), tx = await text(); ok("clicar no nome de alguém no chat abre o perfil", dlg && /membro desde/i.test(tx) && /servidores em comum|seus servidores/i.test(tx), `dialogo=${dlg} membro=${/membro desde/i.test(tx)} comum=${/servidores em comum/i.test(tx)} cartao=${(await ev(`document.querySelector('[role=dialog][aria-label="Perfil"]')?.innerText ?? ''`)).slice(0, 200).replace(/\n/g, ' / ')} botoes=${await ev(`[...document.querySelectorAll('main button')].map(b=>b.innerText.trim()).filter(x=>/^teste\\d$/.test(x)).join(",")`)}`); }
await shot("/tmp/profile-card.png");
await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`); await sleep(400);
for (let i = 0; i < 40 && !(await ev(`[...document.querySelectorAll('main button')].some(b=>b.innerText.trim()==='teste1')`)); i++) await sleep(250);
await ev(`[...document.querySelectorAll('main button')].find(b=>b.innerText.trim()==='teste1')?.click()`);
for (let i = 0; i < 32 && !/este é o seu perfil/i.test(await text()); i++) await sleep(250);
ok("no próprio perfil aparece «Editar perfil»", /este é o seu perfil/i.test(await text()) && /Editar perfil/.test(await text()));
await click("Editar perfil"); await sleep(600);
ok("«Editar perfil» abre a edição de foto e nome", await ev(`!!document.querySelector('input[type=file]')`));
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
