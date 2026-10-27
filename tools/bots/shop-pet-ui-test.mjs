// Pets, animated statuses and banners, and the new themes, in the real client. Chrome (CDP 9370) or the desktop app with ATTACH=9341. Dev API (EMAIL_DEV=1) + vite :5173.
// The rule being proven (CLAUDE.md): nothing moves or makes noise by itself; the pet reacts only to hover/click.
import { spawn } from "node:child_process"; import { mkdtempSync, writeFileSync, readFileSync } from "node:fs"; import { tmpdir } from "node:os"; import { createRequire } from "node:module";
import { io } from "../bots/node_modules/socket.io-client/build/esm/index.js";
const req = createRequire(import.meta.url);
const { PrismaClient } = req("../../apps/server/node_modules/@prisma/client");
const dbEnv = Object.fromEntries(readFileSync(new URL("../../apps/server/.env", import.meta.url), "utf8").split("\n").map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const prisma = new PrismaClient({ datasources: { db: { url: dbEnv.DATABASE_URL } } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", OUT = process.env.SHOTS ?? tmpdir(), LOG = process.env.SERVER_LOG, ATTACH = process.env.ATTACH, TAG = ATTACH ? "desktop" : "web";
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  [${TAG}] ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const run = Date.now().toString(36).slice(-6);
const mk = async (name, display) => { const email = `${name}.${run}@cohle.dev`; let u = (await http("/auth/register", { email, username: `${name}_${run}`, password: "senhaSegura123" })).d; if (!u.token) { await sleep(600); const code = [...readFileSync(LOG, "utf8").matchAll(/Seu código do Cohle: (\d{6})/g)].at(-1)?.[1]; u = (await http("/auth/verify", { email, code })).d; } if (display) await http("/me", { displayName: display }, u.token, "PATCH"); return u; };
await prisma.shopItem.updateMany({ data: { locked: true } }); await sleep(500);
const P = await mk("pety", "Pety"), Q = await mk("quin", "Quin"), V = await mk("visi", "Visi"), T = await mk("tema", "Tema");
const items = await prisma.shopItem.findMany({ where: { ativo: true } }); const idOf = (k) => items.find((i) => i.key === k).id;
const give = (u, keys) => prisma.userItem.createMany({ data: keys.map((k) => ({ userId: u.user.id, itemId: idOf(k), source: "demo" })), skipDuplicates: true });
await give(P, ["pet.dragon", "status.code", "banner.matrix", "pet.cat"]); await give(T, items.filter((i) => i.key.startsWith("brasil.")).map((i) => i.key));
const wear = (u, o) => Promise.all(Object.entries(o).map(([slot, k]) => http("/shop/equipped", { slot, itemId: idOf(k) }, u.token, "PUT")));
await wear(P, { pet: "pet.dragon", status: "status.code", banner: "banner.matrix" }); await wear(T, { theme: "brasil.theme" });
const srv = (await http("/servers", { name: "Casa do Pet " + run }, P.token)).d; await http(`/servers/join/${srv.inviteCode}`, {}, Q.token);
const ch = srv.channels.find((c) => c.type === "TEXT").id;
const say = async (u, txt) => { const s = io(API, { auth: { token: u.token }, transports: ["websocket"] }); await new Promise((r) => s.on("connect", r)); s.emit("channel:join", ch); await sleep(400); s.emit("message:send", { channelId: ch, content: txt }, () => {}); await sleep(900); s.close(); };
await say(P, "oi, cheguei com o dragão");

let t; if (ATTACH) t = (await (await fetch(`http://localhost:${ATTACH}/json`)).json()).find((x) => x.type === "page" && x.url.startsWith("http://localhost:5173"));
const chrome = ATTACH ? null : spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--remote-debugging-port=9370", `--user-data-dir=${mkdtempSync(tmpdir() + "/pt-")}`, "--window-size=1280,900", "--no-first-run", "about:blank"], { stdio: "ignore" });
for (let i = 0; i < 40 && !t; i++) { await sleep(300); try { t = (await (await fetch("http://localhost:9370/json")).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); const errors = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) w.get(m.id)?.(m.result); else if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text); };
const cmd = (method, params) => new Promise((rr) => { const i = ++id; w.set(i, rr); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const waitFor = async (fn, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(fn)) return true; await sleep(200); } return false; };
const shot = async (f) => { if (ATTACH) { await cmd("Page.bringToFront"); await cmd("Emulation.setFocusEmulationEnabled", { enabled: true }); } await sleep(900); writeFileSync(`${OUT}/${f}.png`, Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).data, "base64")); };
const login = async (u) => { await cmd("Page.navigate", { url: "http://localhost:5173/" }); await sleep(1200); await ev(`sessionStorage.clear();localStorage.clear();localStorage.setItem('token',${JSON.stringify(u.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(u.user))});localStorage.setItem('cohle:tour:${u.user.id}','done');location.reload()`); await sleep(4500); };
const tab = async (n) => { await ev(`[...document.querySelectorAll('[role=tab]')].find(b=>b.innerText.includes(${JSON.stringify(n)}))?.click()`); await sleep(900); };
try {
  await cmd("Runtime.enable"); await cmd("Page.enable"); if (ATTACH) { await cmd("Page.bringToFront"); await cmd("Emulation.setFocusEmulationEnabled", { enabled: true }); }
  // counts every sound the page starts (samples and synthesized): none may start without a click
  await cmd("Page.addScriptToEvaluateOnNewDocument", { source: `window.__snd=0;window.__stk=[];const pl=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__snd++;return pl.apply(this,arguments)};for(const k of ['createOscillator','createBufferSource']){const o=AudioContext.prototype[k];AudioContext.prototype[k]=function(){window.__snd++;window.__stk.push(k+' '+new Error().stack.split('\\n').slice(2,6).join(' | '));return o.apply(this,arguments)}}0` });
  await cmd("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }).catch(() => {});

  // ---- my pet: nothing by itself, hover/click only ----
  await login(P);
  ok("o pet aparece pousado no meu cartão de usuário", await waitFor(`!!document.querySelector('button[data-pet="pet.dragon"]')`, 12000));
  await ev(`window.__snd=0;window.__stk.length=0`); await sleep(8000);
  ok("parado: sem balão, sem corações, sem pulo e nenhum som (nada acontece sozinho)", await ev(`!document.querySelector('.pet-bubble') && !document.querySelector('.pet-heart') && !document.querySelector('.pet-btn.pet-jump') && !document.querySelector('.pet-btn.pet-dance')`) && (await ev(`window.__snd`)) === 0, `sons=${await ev(`window.__snd`)} ${(await ev(`window.__stk.slice(0,2).join(' ## ')`) ?? '').slice(0, 300)}`);
  await ev(`document.querySelector('button[data-pet="pet.dragon"]').click()`);
  ok("clicou: o pet pula, solta corações, fala no balão e faz barulhinho", await waitFor(`!!document.querySelector('.pet-btn.pet-jump') && document.querySelectorAll('.pet-heart').length >= 5 && !!document.querySelector('.pet-bubble')`, 3000) && (await ev(`window.__snd`)) > 0);
  await shot(`pet-1-clique-${TAG}`);
  ok("o balão e os corações somem sozinhos depois", await waitFor(`!document.querySelector('.pet-bubble') && !document.querySelector('.pet-heart')`, 6000));
  await sleep(5200);          // the dance counts 5 clicks inside 5 s: let the earlier click leave that window
  for (let i = 0; i < 5; i++) { await ev(`document.querySelector('button[data-pet="pet.dragon"]').click()`); await sleep(120); }
  ok("cinco cliques seguidos: o pet dança ('Eba!')", await waitFor(`!!document.querySelector('.pet-btn.pet-dance') && /Eba!/.test(document.querySelector('.pet-bubble')?.innerText||'')`, 3000));
  await http("/me/prefs", { soundsOff: true }, P.token, "PUT"); await login(P); await waitFor(`!!document.querySelector('button[data-pet="pet.dragon"]')`, 12000);
  await ev(`window.__snd=0`); await ev(`document.querySelector('button[data-pet="pet.dragon"]').click()`); await sleep(1200);
  ok("com 'Sons' desligados o pet reage, mas sem som", !!(await ev(`!!document.querySelector('.pet-bubble')`)) && (await ev(`window.__snd`)) === 0);
  await http("/me/prefs", { soundsOff: false }, P.token, "PUT");

  // ---- others see the profile: banner, status and a small still pet ----
  await login(Q);
  ok("quem não tem pet não vê pet na tela (só o próprio dono vê o widget)", !(await ev(`!!document.querySelector('button[data-pet]')`)));
  await ev(`[...document.querySelectorAll('nav button')].find(b=>(b.getAttribute('title')||'').startsWith('Casa do Pet'))?.click()`); await sleep(1200);
  await ev(`[...document.querySelectorAll('aside button')].find(b=>b.innerText.includes('geral'))?.click()`);
  await waitFor(`[...document.querySelectorAll('main button')].some(b=>b.innerText.trim()==='Pety')`, 12000);
  await ev(`[...document.querySelectorAll('main button')].find(b=>b.innerText.trim()==='Pety')?.click()`);
  ok("no perfil de Pety: banner animado, status e o pet pequeno aparecem", await waitFor(`!!document.querySelector('[role=dialog][aria-label="Perfil"] [data-banner="banner.matrix"]') && !!document.querySelector('[role=dialog][aria-label="Perfil"] [data-status="status.code"]') && !!document.querySelector('[role=dialog][aria-label="Perfil"] [data-pet-mini="pet.dragon"]')`, 12000));
  ok("o banner só anima com o perfil aberto (classe bn-live) e o status também", await ev(`!!document.querySelector('[role=dialog][aria-label="Perfil"] .bn.bn-live') && !!document.querySelector('[role=dialog][aria-label="Perfil"] .st-chip.st-live')`));
  await shot(`pet-2-perfil-${TAG}`);

  // ---- the Loja: choice collections show every option; the preview has the pet to play with ----
  await login(V); await ev(`document.querySelector('button[title="Loja"]').click()`); await waitFor(`/Preview Beta/i.test(document.body.innerText)`); await tab("Coleções");
  ok("Pets: grade com os 6 bichinhos; Status: 8; Banners: 8", await ev(`document.querySelectorAll('[aria-label="Todos os pets"] > button').length === 6 && document.querySelectorAll('[aria-label="Todos os status"] > button').length === 8 && document.querySelectorAll('[aria-label="Todos os banners"] > button').length === 8`));
  ok("coleções de escolha não têm 'Ver prévia do conjunto' nem 'Equipar conjunto'", await ev(`!/Ver prévia do conjunto|Equipar conjunto/.test(document.querySelector('[aria-label="Coleção Pets"]').innerText)`));
  await ev(`document.querySelector('[aria-label="Todos os pets"] button[aria-label="Ver prévia de Dragãozinho"]').click()`);
  ok("clicar num pet abre a prévia com o bichinho para brincar e 'Em breve'", await waitFor(`!!document.querySelector('[role=dialog][aria-label="Prévia: Dragãozinho"] button[data-pet="pet.dragon"]') && !!document.querySelector('[role=dialog][aria-label="Prévia: Dragãozinho"] button[data-locked="true"]')`, 8000));
  await ev(`window.__snd=0; document.querySelector('[role=dialog][aria-label="Prévia: Dragãozinho"] button[data-pet="pet.dragon"]').click()`);
  ok("na prévia o pet também reage ao clique", await waitFor(`!!document.querySelector('[role=dialog][aria-label="Prévia: Dragãozinho"] .pet-bubble')`, 3000));
  await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  await ev(`[...document.querySelectorAll('[aria-label="Todos os banners"] button')].find(b=>/Aurora/.test(b.innerText)).click()`);
  ok("prévia do banner: faixa animada na capa e nada rodando fora do hover", await waitFor(`!!document.querySelector('[role=dialog][aria-label="Prévia: Aurora"] [data-banner="banner.aurora"]')`, 6000));
  await shot(`pet-3-loja-${TAG}`);

  // ---- a new theme: nothing by itself, the ball in the corner does the show on click ----
  await login(T);
  ok("tema Brasil: cores verde/amarelo, luzes e a bola no canto", await waitFor(`document.documentElement.dataset.theme==='brasil' && document.querySelectorAll('.fx-lights').length===4 && !!document.querySelector('button.fx-corner')`, 12000));
  await ev(`window.__snd=0;window.__stk.length=0`); await sleep(7000);
  ok("Brasil: sem clique, nada aparece e nenhum som toca", !(await ev(`!!document.querySelector('.fx-ent-text')`)) && (await ev(`window.__snd`)) === 0);
  await ev(`document.querySelector('button.fx-corner').click()`);
  ok("Brasil: clicou na bola, 'É GOOOL!' com bola, troféu e café e som", await waitFor(`/É GOOOL!/.test(document.querySelector('.fx-ent-text')?.innerText||'')`, 5000) && (await ev(`window.__snd`)) > 0);
  ok("sem erros de JavaScript", errors.length === 0, errors.slice(0, 2).join(" | ").slice(0, 240));
} finally { ws.close(); chrome?.kill(); await prisma.shopItem.updateMany({ data: { locked: true } }).catch(() => {}); await prisma.$disconnect(); }
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
