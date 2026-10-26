// Profile + display name + suggestions in the real client. Chrome (default, headless, CDP 9358) or the desktop app: ATTACH=9341 (Electron, same dev stack).
// Needs dev API (OWNER_EMAILS=teste1@cohle.dev, EMAIL_DEV=1, log in SERVER_LOG) + vite :5173.
import { spawn } from "node:child_process"; import { mkdtempSync, writeFileSync, readFileSync } from "node:fs"; import { tmpdir } from "node:os";
import { io } from "../bots/node_modules/socket.io-client/build/esm/index.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", OUT = process.env.SHOTS ?? tmpdir(), LOG = process.env.SERVER_LOG, ATTACH = process.env.ATTACH, TAG = ATTACH ? "desktop" : "web";
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  [${TAG}] ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const last = (re) => [...readFileSync(LOG, "utf8").matchAll(re)].at(-1)?.[1];
const run = Date.now().toString(36).slice(-5);
const mk = async (name) => { const email = `${name}.${run}@cohle.dev`; const r = await http("/auth/register", { email, username: `${name}_${run}`, password: "senhaSegura123" }); if (r.d.token) return r.d; await sleep(500); return (await http("/auth/verify", { email, code: last(/Seu código do Cohle: (\d{6})/g) })).d; };
const login = async (e) => (await http("/auth/login", { email: e, password: "teste12345" })).d;
const a = await login("teste1@cohle.dev"), b = await login("teste2@cohle.dev");
// clean slate for the two test accounts
for (const [me, other] of [[a, b], [b, a]]) { const f = (await http("/friends", null, me.token)).d; for (const r of [...f.incoming, ...f.outgoing]) await http(`/friends/${r.id}/decline`, {}, me.token); await http(`/friends/${other.user.id}`, null, me.token, "DELETE"); }
await http("/me", { displayName: null, bio: null, bannerColor: null, username: "teste1" }, a.token, "PATCH");
await http(`/users/${a.user.id}/note`, { text: "" }, b.token, "PUT");     // a note left by an earlier run would hide the "saved" message
await http("/friends/request", { handle: "@teste2" }, a.token); const inc = (await http("/friends", null, b.token)).d.incoming[0]; await http(`/friends/${inc.id}/accept`, {}, b.token);
const C = await mk("cris"); await http("/friends/request", { handle: "@teste1" }, C.token); await http("/friends/request", { handle: "@teste2" }, C.token);
for (const t of [a, b]) { const f = (await http("/friends", null, t.token)).d.incoming.find((r) => r.user.id === C.user.id); if (f) await http(`/friends/${f.id}/accept`, {}, t.token); }
const srv = (await http("/servers", null, a.token)).d.find((s) => s.name === "Servidor de Teste");
const D = await mk("duda"); await http(`/servers/join/${srv.inviteCode}`, {}, D.token);

let t; if (ATTACH) t = (await (await fetch(`http://localhost:${ATTACH}/json`)).json()).find((x) => x.type === "page" && x.url.startsWith("http://localhost:5173"));
const chrome = ATTACH ? null : spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--remote-debugging-port=9358", `--user-data-dir=${mkdtempSync(tmpdir() + "/pf-")}`, "--window-size=1280,900", "--no-first-run", "about:blank"], { stdio: "ignore" });
for (let i = 0; i < 40 && !t; i++) { await sleep(300); try { t = (await (await fetch("http://localhost:9358/json")).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); const errors = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) w.get(m.id)?.(m.result); else if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text); };
const cmd = (method, params) => new Promise((rr) => { const i = ++id; w.set(i, rr); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const text = () => ev(`document.body.innerText`);
const click = (txt, scope = "button") => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(scope)})].find(b=>b.innerText.includes(${JSON.stringify(txt)}));if(e)e.click();return !!e})()`);
const setVal = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return false;const d=Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value');d.set.call(e,${JSON.stringify(v)});e.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
const shot = async (f) => { if (ATTACH) { await cmd("Page.bringToFront"); await cmd("Emulation.setFocusEmulationEnabled", { enabled: true }); } await sleep(800); writeFileSync(`${OUT}/${f}.png`, Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).data, "base64")); };
const open = async (who) => { await cmd("Page.navigate", { url: "http://localhost:5173/" }); await sleep(1200); await ev(`sessionStorage.clear();localStorage.clear();localStorage.setItem('token',${JSON.stringify(who.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(who.user))});localStorage.setItem('cohle:tour:${who.user.id}','done');location.reload()`); await sleep(3800); };
const waitText = async (re, ms = 9000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (re.test(await text())) return true; await sleep(250); } return false; };
const noSide = () => ev(`document.documentElement.scrollWidth <= window.innerWidth + 1`);
const esc = async () => { await ev(`window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))`); await sleep(300); };
try {
  await cmd("Runtime.enable"); await cmd("Page.enable");
  await cmd("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }).catch(() => {});
  // ---- teste1 edits the profile through the form ----
  await open(a);
  await ev(`document.querySelector('button[title="Configurações e perfil"]').click()`); await sleep(700);
  await click("Editar foto e nome"); await sleep(700);
  { const t0 = await text(); ok("o editor tem nome de exibição, @, sobre mim e cor da capa", ["Nome de exibição", "@usuário", "Sobre mim", "Cor da capa"].every((x) => t0.includes(x))); }
  await setVal('input[placeholder="teste1"]', "  Ana   Teste  "); await setVal('textarea[aria-label="Sobre mim"]', "Gosto de jogar de noite.\nFalo pouco, escuto muito."); await sleep(200);
  await ev(`document.querySelector('button[aria-label="Cor #3b8cff"]').click()`); await sleep(300);
  ok("pré-visualização mostra o nome de exibição e o @", /Ana Teste/.test(await text()) && /@teste1/.test(await text()));
  await shot(`prof-1-editor-${TAG}`);
  await click("Salvar", "button.grad"); await sleep(1500);
  const me = (await http("/me", null, a.token)).d;
  ok("salvou nome de exibição (limpo), descrição e cor", me.displayName === "Ana Teste" && me.bio?.includes("Falo pouco") && me.bannerColor === "#3b8cff", JSON.stringify({ n: me.displayName, c: me.bannerColor }));
  ok("o nome aparece na barra lateral e o @ não mudou", /Ana Teste/.test(await text()) && me.username === "teste1");
  ok("o painel de admin continua disponível após salvar (papel preservado)", (await ev(`localStorage.getItem('me')||sessionStorage.getItem('me')`)).includes('"role":"OWNER"'));
  await ev(`document.querySelector('button[title="Configurações e perfil"]').click()`); await sleep(700);
  ok("o cartão da conta mostra a cor da capa", /#3b8cff|59,\s*140,\s*255/i.test((await ev(`[...document.querySelectorAll('[role=dialog] div[style]')].map(d=>d.getAttribute('style')).find(x=>x.includes('gradient'))`)) ?? ""));
  await esc();
  // teste1 speaks and sits in a call, so teste2 can see the author name and the activity
  const sk = io(API, { auth: { token: a.token }, transports: ["websocket"] }); await new Promise((r) => sk.on("connect", r));
  const text1 = (await http("/servers", null, a.token)).d.find((s) => s.name === "Servidor de Teste"); const geral = text1.channels.find((c) => c.type === "TEXT"), voice = text1.channels.find((c) => c.type === "VOICE");
  sk.emit("channel:join", geral.id); await sleep(400); const msg = "oi do perfil " + run; sk.emit("message:send", { channelId: geral.id, content: msg }, () => {}); await sleep(600);
  sk.emit("voice:join", voice.id); await sleep(900);

  // ---- teste2 looks at teste1 ----
  await open(b);
  await ev(`[...document.querySelectorAll('button')].find(x=>x.getAttribute('title')==='Servidor de Teste'||x.innerText.includes('Servidor de Teste'))?.click()`); await sleep(900);
  await click("geral", "button, a, div[role=button]"); await sleep(1500);
  ok("no chat aparece o nome de exibição, não o @", new RegExp(`Ana Teste[\\s\\S]*${msg}`).test(await text()));
  await ev(`[...document.querySelectorAll('button.font-bold')].find(x=>x.innerText.includes('Ana Teste'))?.click()`); await waitText(/Amigos em comum|Membro desde/i);
  let tx = await text();
  ok("cartão: nome de exibição, @ e atividade (em chamada, com o lugar)", /Ana Teste/.test(tx) && /@teste1/.test(tx) && /Em chamada/.test(tx) && /Sala de voz · Servidor de Teste/.test(tx), (tx.match(/Em chamada[^\n]*/) ?? [""])[0]);
  ok("cartão: Sobre mim com a descrição e quebra de linha", /Sobre mim/i.test(tx) && /Gosto de jogar de noite\./.test(tx) && /Falo pouco/.test(tx));
  ok("cartão: Membro desde e Amigos desde", /Membro desde/i.test(tx) && /Amigos desde/i.test(tx));
  ok("cartão: servidores em comum", /Servidores em comum/i.test(tx) && /Servidor de Teste/.test(tx));
  ok("cartão: amigos em comum (cris)", /Amigos em comum \(\d+\)/i.test(tx) && new RegExp(`cris_${run}`, "i").test(tx), (tx.match(/Amigos em comum[^\n]*\n[^\n]*/i) ?? ["sem a seção"])[0].replace(/\n/g, " | "));
  ok("cartão: a capa usa a cor escolhida", /#3b8cff|59,\s*140,\s*255/i.test((await ev(`document.querySelector('[role=dialog] div[style*="gradient"]')?.getAttribute('style')`)) ?? ""));
  await shot(`prof-2-cartao-${TAG}`);
  // private note
  await setVal('textarea[aria-label="Nota privada sobre esta pessoa"]', "Colega de equipe"); await ev(`(()=>{const t=document.querySelector('textarea[aria-label="Nota privada sobre esta pessoa"]');t.focus();t.dispatchEvent(new FocusEvent('focusout',{bubbles:true}))})()`); const saved = await waitText(/Nota salva/);
  const noteApi = (await http(`/users/${a.user.id}/profile`, null, b.token)).d.note; ok("a nota é salva ao sair do campo", saved && noteApi === "Colega de equipe", `tela=${saved} api=${JSON.stringify(noteApi)} campo=${JSON.stringify(await ev(`document.querySelector('textarea[aria-label="Nota privada sobre esta pessoa"]')?.value`))} estado=${JSON.stringify(await ev(`document.querySelector('textarea[aria-label="Nota privada sobre esta pessoa"]')?.nextElementSibling?.innerText`))}`);
  ok("e quem é o dono do perfil não vê a nota", (await http(`/users/${b.user.id}/profile`, null, a.token)).d.note === undefined);
  await esc(); await click("Todos"); // (friends hub keeps working underneath)
  sk.emit("voice:leave"); sk.close(); await sleep(600);

  // ---- friends hub with display names + suggestions ----
  await ev(`document.querySelector('button[title="Mensagens diretas"]').click()`); await sleep(900);
  await click("Todos"); await sleep(500); tx = await text();
  ok("amigos: nome de exibição com @ embaixo", /Ana Teste/.test(tx) && /@teste1 ·/.test(tx));
  await setVal('input[aria-label="Buscar amigo"]', "ana tes"); await sleep(300);
  ok("amigos: a busca acha pelo nome de exibição", /Ana Teste/.test(await text()) && !/cris_/.test(await text()));
  await click("Adicionar amigo"); await sleep(1500); tx = await text();
  ok("sugestões: quem está no mesmo servidor e ainda não é amigo", /Pessoas que você talvez conheça/i.test(tx) && new RegExp(`duda_${run}`).test(tx) && /Servidor em comum: Servidor de Teste/.test(tx));
  ok("sugestões: não lista amigos", !/Servidor em comum: Servidor de Teste[\s\S]*teste1 ·/.test(tx.split(/Pessoas que você talvez conheça/i)[1] ?? ""));
  await shot(`prof-3-sugestoes-${TAG}`);
  await ev(`[...document.querySelectorAll('section[aria-label="Pessoas que você talvez conheça"] button')].find(x=>x.innerText.includes('Adicionar')&&x.closest('.group')?.innerText.includes('duda_${run}'))?.click()`);
  let sent = false; for (let i = 0; i < 24 && !sent; i++) { await sleep(400); sent = (await http("/friends", null, b.token)).d.outgoing.some((r) => r.user.id === D.user.id); }
  await sleep(600);
  ok("adicionar pela sugestão envia o pedido e a pessoa sai da lista", sent && !(await text()).split(/Pessoas que você talvez conheça/i)[1]?.includes(`duda_${run}`));

  // ---- phone size ----
  if (!ATTACH) {
    await cmd("Emulation.setDeviceMetricsOverride", { width: 390, height: 800, deviceScaleFactor: 2, mobile: true }); await sleep(600);
    await open(b); await ev(`[...document.querySelectorAll('button')].find(x=>x.getAttribute('title')==='Mensagens diretas')?.click()`); await sleep(800);
    await http("/me", { bio: "Texto de teste" }, a.token, "PATCH");
    ok("celular: central de amigos sem rolagem lateral", await noSide());
    await esc(); await ev(`document.querySelector('button[title="Configurações e perfil"]')?.click()`); await sleep(600); await click("Editar foto e nome"); await sleep(700);
    ok("celular: editor de perfil sem rolagem lateral", await noSide()); await shot(`prof-4-editor-celular-${TAG}`);
  }
  ok("sem erros de JavaScript", errors.length === 0, errors.slice(0, 2).join(" | ").slice(0, 200));
} finally {
  await http("/me", { displayName: null, bio: null, bannerColor: null }, a.token, "PATCH");
  ws.close(); chrome?.kill();
}
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
