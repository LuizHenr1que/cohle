// The Loja is locked ("Em breve") and only the owner (teste1 on the dev stack) gives gifts. Chrome (CDP 9368) or the desktop app with ATTACH=9341. Dev API (OWNER_EMAILS=teste1@cohle.dev, EMAIL_DEV=1) + vite :5173.
import { spawn } from "node:child_process"; import { mkdtempSync, writeFileSync, readFileSync } from "node:fs"; import { tmpdir } from "node:os"; import { createRequire } from "node:module";
const req = createRequire(import.meta.url);
const { PrismaClient } = req("../../apps/server/node_modules/@prisma/client");
const dbEnv = Object.fromEntries(readFileSync(new URL("../../apps/server/.env", import.meta.url), "utf8").split("\n").map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const prisma = new PrismaClient({ datasources: { db: { url: dbEnv.DATABASE_URL } } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", OUT = process.env.SHOTS ?? tmpdir(), LOG = process.env.SERVER_LOG, ATTACH = process.env.ATTACH, TAG = ATTACH ? "desktop" : "web";
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  [${TAG}] ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const run = Date.now().toString(36).slice(-6);
const mk = async (name) => { const email = `${name}.${run}@cohle.dev`; const r = await http("/auth/register", { email, username: `${name}_${run}`, password: "senhaSegura123" }); if (r.d.token) return r.d; await sleep(600); const code = [...readFileSync(LOG, "utf8").matchAll(/Seu código do Cohle: (\d{6})/g)].at(-1)?.[1]; return (await http("/auth/verify", { email, code })).d; };
await prisma.shopItem.updateMany({ data: { locked: true } }); await sleep(600);
const V = await mk("vis"), W = await mk("amg"); const owner = (await http("/auth/login", { email: "teste1@cohle.dev", password: "teste12345" })).d;
for (const slot of ["frame", "badge", "theme", "entrance", "name_effect"]) await http("/shop/equipped", { slot, itemId: null }, owner.token, "PUT");

let t; if (ATTACH) t = (await (await fetch(`http://localhost:${ATTACH}/json`)).json()).find((x) => x.type === "page" && x.url.startsWith("http://localhost:5173"));
const chrome = ATTACH ? null : spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--remote-debugging-port=9368", `--user-data-dir=${mkdtempSync(tmpdir() + "/sgf-")}`, "--window-size=1280,900", "--no-first-run", "about:blank"], { stdio: "ignore" });
for (let i = 0; i < 40 && !t; i++) { await sleep(300); try { t = (await (await fetch("http://localhost:9368/json")).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); const errors = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) w.get(m.id)?.(m.result); else if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text); };
const cmd = (method, params) => new Promise((rr) => { const i = ++id; w.set(i, rr); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const waitFor = async (fn, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(fn)) return true; await sleep(250); } return false; };
const setVal = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(v)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
const shot = async (f) => { if (ATTACH) { await cmd("Page.bringToFront"); await cmd("Emulation.setFocusEmulationEnabled", { enabled: true }); } await sleep(900); writeFileSync(`${OUT}/${f}.png`, Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).data, "base64")); };
const login = async (u) => { await cmd("Page.navigate", { url: "http://localhost:5173/" }); await sleep(1200); await ev(`sessionStorage.clear();localStorage.clear();localStorage.setItem('token',${JSON.stringify(u.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(u.user))});localStorage.setItem('cohle:tour:${u.user.id}','done');location.reload()`); await sleep(4500); };
const openShop = async () => { await ev(`document.querySelector('button[title="Loja"]').click()`); return waitFor(`/Preview Beta/i.test(document.body.innerText)`); };
const tab = async (n) => { await ev(`[...document.querySelectorAll('[role=tab]')].find(b=>b.innerText.includes(${JSON.stringify(n)}))?.click()`); await sleep(900); };
try {
  await cmd("Runtime.enable"); await cmd("Page.enable"); if (ATTACH) { await cmd("Page.bringToFront"); await cmd("Emulation.setFocusEmulationEnabled", { enabled: true }); }
  await cmd("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }).catch(() => {});

  // ---- a regular person: everything is visible but locked ----
  await login(V); ok("a Loja abre trancada para quem não é dono", await openShop());
  ok("aviso 'A Loja está trancada por enquanto' aparece", await waitFor(`!!document.querySelector('[role=note][aria-label="Loja trancada"]') && /trancada por enquanto/.test(document.querySelector('[role=note]').innerText)`));
  ok("os itens mostram 'Em breve' com cadeado e nenhum botão 'Pegar'", await ev(`(()=>{const c=[...document.querySelectorAll('[data-item]')];return c.length>0&&c.every(x=>!!x.querySelector('button[data-locked="true"]')&&!/Pegar \\(Beta\\)/.test(x.innerText))})()`));
  ok("o botão 'Em breve' está desabilitado (não dá para clicar)", await ev(`[...document.querySelectorAll('[data-item] button[data-locked="true"]')].every(b=>b.disabled)`));
  await tab("Coleções");
  ok("os banners das coleções mostram 'Em breve' em vez de 'Pegar o conjunto'", await ev(`(()=>{const s=[...document.querySelectorAll('section[aria-label^="Coleção "]')];return s.length>3&&s.every(x=>!!x.querySelector('button[data-locked="true"]')&&!/Pegar o conjunto/.test(x.innerText))})()`));
  ok("quem não é dono não vê nenhum botão 'Presentear'", !(await ev(`[...document.querySelectorAll('button')].some(b=>/Presentear/.test(b.getAttribute('aria-label')||b.innerText))`)));
  await ev(`[...document.querySelectorAll('section[aria-label="Coleção Hacker"] button')].find(b=>/Ver prévia/.test(b.innerText))?.click()`);
  ok("a prévia continua liberada, com 'Em breve' no lugar do botão de pegar", await waitFor(`!!document.querySelector('[role=dialog][aria-label^="Prévia:"] button[data-locked="true"]')`, 6000));
  await shot(`gift-1-trancada-${TAG}`);
  ok("o servidor também recusa pegar (403)", (await http(`/shop/items/${(await http("/shop", null, V.token)).d.items[0].id}/claim`, {}, V.token)).s === 403);

  // ---- the owner gives a gift through the screen ----
  await login(owner); await openShop();
  ok("o dono vê 'Presentear alguém' e 'Presentear' em cada item", await waitFor(`[...document.querySelectorAll('button')].some(b=>/Presentear alguém/.test(b.innerText)) && !!document.querySelector('[data-item] button[aria-label^="Presentear "]')`));
  await tab("Itens"); await ev(`[...document.querySelectorAll('[role=group][aria-label="Coleção"] button')].find(b=>b.innerText.trim()==='Banners animados')?.click()`); await sleep(1000);
  { const info = await ev(`(()=>{const c=[...document.querySelectorAll('[data-item]')], notMine=c.filter((x)=>!/Já é seu/.test(x.innerText));return JSON.stringify({total:c.length,notMine:notMine.length,semCadeado:notMine.filter(x=>!x.querySelector('button[data-locked="true"]')).map(x=>x.dataset.item+':'+x.innerText.replace(/\\n/g,' ').slice(-60)),pegar:c.filter(x=>/Pegar \\(Beta\\)/.test(x.innerText)).map(x=>x.dataset.item)})})()`); const o = JSON.parse(info); ok("o dono também vê 'Em breve' e nenhum botão 'Pegar' (ele usa presenteando)", o.total > 0 && o.notMine > 0 && o.semCadeado.length === 0 && o.pegar.length === 0, info.slice(0, 400)); }

  ok("os cartões do dono (mais altos, com 'Presentear') não se sobrepõem", await ev(`(()=>{const r=[...document.querySelectorAll('[data-item]')].map(x=>x.getBoundingClientRect());if(r.length<4)return false;for(let i=0;i<r.length;i++)for(let j=i+1;j<r.length;j++){const a=r[i],b=r[j];const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left),oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(ox>2&&oy>2)return false}return true})()`));
  await shot(`gift-0-dono-itens-${TAG}`); await tab("Vitrine");
  await ev(`[...document.querySelectorAll('button')].find(b=>/Presentear alguém/.test(b.innerText)).click()`);
  ok("abre a janela Presentear e carrega o catálogo completo", await waitFor(`!!document.querySelector('[role=dialog][aria-label="Presentear"]') && document.querySelectorAll('[aria-label="Itens para presentear"] li').length > 40`));
  await ev(`document.querySelector('button[aria-label="Presentear a mim mesmo"]').click()`);
  ok("'Para mim' escolhe a própria conta dona como destinatária", await waitFor(`/\\(você\\)/.test(document.querySelector('[role=dialog][aria-label="Presentear"]').innerText)`, 4000));
  await ev(`[...document.querySelectorAll('[role=dialog][aria-label="Presentear"] button')].find(b=>b.innerText.trim()==='trocar').click()`);
  await setVal('input[aria-label="Buscar pessoa"]', `vis_${run}`);
  ok("buscar por @usuário acha a pessoa", await waitFor(`!!document.querySelector('[role=listbox] [role=option]') && /vis_${run}/.test(document.querySelector('[role=listbox]').innerText)`));
  await ev(`document.querySelector('[role=listbox] [role=option]').click()`);
  await setVal('input[aria-label="Filtrar itens"]', "Aura de Fogo");
  await ev(`[...document.querySelectorAll('[aria-label="Itens para presentear"] li button')].find(b=>/Aura de Fogo/.test(b.innerText))?.click()`);
  await setVal('input[aria-label="Filtrar itens"]', "");
  await ev(`[...document.querySelectorAll('[aria-label="Itens para presentear"] button')].find(b=>b.innerText.trim()==='coleção inteira' && /HACKER/i.test(b.parentElement.innerText))?.click()`);
  await setVal('input[aria-label="Recado"]', "bem-vindo ao Cohle!");
  ok("a seleção soma a aura e a coleção Hacker inteira (9 itens)", await ev(`/9 selecionados/.test(document.querySelector('[role=dialog][aria-label="Presentear"]').innerText)`));
  await ev(`[...document.querySelectorAll('button')].find(b=>/Enviar presente/.test(b.innerText)).click()`);
  ok("o envio confirma 'Presente enviado' com a quantidade", await waitFor(`/Presente enviado para @vis_${run}: 9 itens/.test(document.body.innerText)`, 12000));
  await shot(`gift-2-enviado-${TAG}`);
  const sv = (await http("/shop", null, V.token)).d;
  ok("no servidor: a pessoa passa a ter os 9 itens e eles estão como não vistos", sv.owned.length >= 9 && sv.unseenGifts.length === 9 && sv.unseenGifts[0].note === "bem-vindo ao Cohle!");

  // ---- the receiver opens the app ----
  await login(V);
  ok("quem recebeu vê 'Você ganhou um presente!' com remetente, recado e os itens", await waitFor(`!!document.querySelector('[role=dialog][aria-label="Você ganhou um presente"]') && /bem-vindo ao Cohle/.test(document.body.innerText) && document.querySelectorAll('[aria-label="Itens do presente"] li').length === 9`, 14000));
  await shot(`gift-3-recebido-${TAG}`);
  await ev(`[...document.querySelectorAll('[role=dialog][aria-label="Você ganhou um presente"] button')].find(b=>/Equipar agora/.test(b.innerText)).click()`);
  ok("'Equipar agora' fecha a tela e veste o presente", await waitFor(`!document.querySelector('[role=dialog][aria-label="Você ganhou um presente"]')`, 10000) && await (async () => { for (let i = 0; i < 20; i++) { const e = (await http("/shop", null, V.token)).d; if (Object.keys(e.equipped).length >= 3 && e.unseenGifts.length === 0) return true; await sleep(300); } return false; })());
  await login(V); await sleep(1500);
  ok("depois de visto, a tela de presente não aparece de novo", !(await ev(`!!document.querySelector('[role=dialog][aria-label="Você ganhou um presente"]')`)));

  // ---- live: online when the gift arrives ----
  await http("/shop/gifts", { to: "@" + V.user.username, itemIds: [(await http("/shop/admin/catalog", null, owner.token)).d.items.find((i) => i.key === "gamer.badge.player1").id], note: "ao vivo!" }, owner.token);
  ok("com a pessoa online, aparece um aviso discreto 'Você ganhou um presente!' (sem janela no meio da tela)", await waitFor(`!!document.querySelector('[role=status][aria-label="Novo presente"]') && !document.querySelector('[role=dialog][aria-label="Você ganhou um presente"]')`, 8000));
  ok("o botão da Loja ganha o selo com a quantidade de presentes", await waitFor(`document.querySelector('[data-gift-badge]')?.getAttribute('data-gift-badge')==='1'`, 6000));
  await ev(`[...document.querySelectorAll('[role=status][aria-label="Novo presente"] button')].find(b=>b.innerText.trim()==='Abrir').click()`);
  ok("clicar em Abrir mostra o presente com o recado", await waitFor(`!!document.querySelector('[role=dialog][aria-label="Você ganhou um presente"]') && /ao vivo!/.test(document.body.innerText)`, 8000));
  await ev(`[...document.querySelectorAll('[role=dialog][aria-label="Você ganhou um presente"] button')].find(b=>/Fechar/.test(b.innerText)).click()`);
  ok("depois de aberto, o selo some", await waitFor(`!document.querySelector('[data-gift-badge]') && !document.querySelector('[role=status][aria-label="Novo presente"]')`, 8000));
  await openShop(); await tab("Inventário");
  ok("o item presenteado aparece no Inventário como 'Já é seu'", await waitFor(`/Já é seu/.test(document.querySelector('[data-item="gamer.badge.player1"]')?.innerText||'')`, 6000));
  ok("sem erros de JavaScript", errors.length === 0, errors.slice(0, 2).join(" | ").slice(0, 240));
} finally { ws.close(); chrome?.kill(); await prisma.shopItem.updateMany({ data: { locked: true } }).catch(() => {}); await prisma.$disconnect(); }
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
