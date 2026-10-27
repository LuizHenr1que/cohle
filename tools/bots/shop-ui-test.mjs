// The Loja in the real client. Chrome (default, headless, CDP 9361) or the desktop app: ATTACH=9341. Dev API (EMAIL_DEV=1, log in SERVER_LOG) + vite :5173.
import { spawn } from "node:child_process"; import { mkdtempSync, writeFileSync, readFileSync } from "node:fs"; import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { io } from "../bots/node_modules/socket.io-client/build/esm/index.js";
const req = createRequire(import.meta.url);
const { PrismaClient } = req("../../apps/server/node_modules/@prisma/client");
const dbEnv = Object.fromEntries(readFileSync(new URL("../../apps/server/.env", import.meta.url), "utf8").split("\n").map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const prisma = new PrismaClient({ datasources: { db: { url: dbEnv.DATABASE_URL } } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", OUT = process.env.SHOTS ?? tmpdir(), LOG = process.env.SERVER_LOG, ATTACH = process.env.ATTACH, TAG = ATTACH ? "desktop" : "web";
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  [${TAG}] ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const last = (re) => [...readFileSync(LOG, "utf8").matchAll(re)].at(-1)?.[1];
const run = Date.now().toString(36).slice(-6);
const mk = async (name) => { const email = `${name}.${run}@cohle.dev`; const r = await http("/auth/register", { email, username: `${name}_${run}`, password: "senhaSegura123" }); if (r.d.token) return r.d; await sleep(500); return (await http("/auth/verify", { email, code: last(/Seu código do Cohle: (\d{6})/g) })).d; };
// Ano Novo starts on 20 Dec: open its window in the dev database for this run (restored at the end)
const nyOrig = await prisma.collection.findUnique({ where: { key: "anonovo" } });
await prisma.collection.update({ where: { key: "anonovo" }, data: { inicio: new Date(Date.now() - 86_400_000), fim: new Date(Date.now() + 10 * 86_400_000) } }); await sleep(600);
const A = await mk("ana"), B = await mk("bia"), H = await mk("hel"), X = await mk("hax"), N = await mk("nye");
const owner = (await http("/auth/login", { email: "teste1@cohle.dev", password: "teste12345" })).d;
const srv = (await http("/servers", { name: "Loja UI " + run }, owner.token)).d, vch = srv.channels.find((c) => c.type === "VOICE").id;
await http(`/servers/join/${srv.inviteCode}`, {}, A.token); await http(`/servers/join/${srv.inviteCode}`, {}, B.token);
// B owns and wears the whole Natal set (entrance included), A starts with nothing
const shB = (await http("/shop", null, B.token)).d; for (const it of shB.items.filter((i) => i.key.startsWith("natal."))) await http(`/shop/items/${it.id}/claim`, {}, B.token);          // only Natal: claiming is limited to 30 a minute
await http("/shop/equipped/set", { collectionId: shB.collections.find((c) => c.key === "natal").id }, B.token);

await http("/me/prefs", { seasonalAuto: false }, A.token, "PUT");      // the season's ambient snow would load the effects chunk on its own; first prove the shop stays lazy without it
// H wears the whole Halloween set from the start
const shH = (await http("/shop", null, H.token)).d; for (const it of shH.items.filter((i) => i.key.startsWith("halloween."))) await http(`/shop/items/${it.id}/claim`, {}, H.token);
await http("/shop/equipped/set", { collectionId: shH.collections.find((c) => c.key === "halloween").id }, H.token);
const shX = (await http("/shop", null, X.token)).d; for (const it of shX.items.filter((i) => i.key.startsWith("hacker."))) await http(`/shop/items/${it.id}/claim`, {}, X.token);
await http("/shop/equipped/set", { collectionId: shX.collections.find((c) => c.key === "hacker").id }, X.token);
const shN = (await http("/shop", null, N.token)).d; for (const it of shN.items.filter((i) => i.key.startsWith("anonovo."))) await http(`/shop/items/${it.id}/claim`, {}, N.token);
await http("/shop/equipped/set", { collectionId: shN.collections.find((c) => c.key === "anonovo").id }, N.token);
let t; if (ATTACH) t = (await (await fetch(`http://localhost:${ATTACH}/json`)).json()).find((x) => x.type === "page" && x.url.startsWith("http://localhost:5173"));
const chrome = ATTACH ? null : spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--remote-debugging-port=9361", `--user-data-dir=${mkdtempSync(tmpdir() + "/su-")}`, "--window-size=1280,860", "--no-first-run", "about:blank"], { stdio: "ignore" });
for (let i = 0; i < 40 && !t; i++) { await sleep(300); try { t = (await (await fetch("http://localhost:9361/json")).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); const errors = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) w.get(m.id)?.(m.result); else if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text); };
const cmd = (method, params) => new Promise((rr) => { const i = ++id; w.set(i, rr); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const text = () => ev(`document.body.innerText`);
const waitFor = async (fn, ms = 12000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(fn)) return true; await sleep(250); } return false; };
const click = (txt, scope = "button") => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(scope)})].find(b=>b.innerText.includes(${JSON.stringify(txt)}));if(e)e.click();return !!e})()`);
const clickIn = (section, txt) => ev(`(()=>{const sec=document.querySelector(${JSON.stringify(`[aria-label="Coleção ${section}"]`)});const e=sec&&[...sec.querySelectorAll("button")].find(b=>b.innerText.includes(${JSON.stringify(txt)}));if(e)e.click();return !!e})()`);
const shot = async (f) => { if (ATTACH) { await cmd("Page.bringToFront"); await cmd("Emulation.setFocusEmulationEnabled", { enabled: true }); } await sleep(900); writeFileSync(`${OUT}/${f}.png`, Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).data, "base64")); };
const noSide = () => ev(`document.documentElement.scrollWidth <= window.innerWidth + 1`);
const loaded = (re) => ev(`performance.getEntriesByType('resource').some(r=>${re}.test(r.name))`);
const tab = async (name) => { await ev(`[...document.querySelectorAll('[role=tab]')].find(b=>b.innerText.includes(${JSON.stringify(name)}))?.click()`); await sleep(900); };
const effects = () => ev(`({ lights: document.querySelectorAll('.fx-lights').length, tree: !!document.querySelector('.fx-tree'), canvas: !!document.querySelector('[id^="fx-snow-"] canvas'), count: /Faltam \\d+ dias? para o Natal|Natal/.test(document.body.innerText) })`);
try {
  await cmd("Runtime.enable"); await cmd("Page.enable");
  // counts every sound the page starts (sample elements and synthesized oscillators/noise): the rule is that none starts without a click
  await cmd("Page.addScriptToEvaluateOnNewDocument", { source: `window.__snd=0;window.__stk=[];const pl=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__snd++;window.__stk.push('audio '+this.src.split('/').pop()+' '+new Error().stack.split('\\n').slice(2,5).join(' | '));return pl.apply(this,arguments)};for(const k of ['createOscillator','createBufferSource']){const o=AudioContext.prototype[k];AudioContext.prototype[k]=function(){window.__snd++;window.__stk.push(k+' '+new Error().stack.split('\\n').slice(2,6).join(' | '));return o.apply(this,arguments)}}0` });
  if (ATTACH) { await cmd("Page.bringToFront"); await cmd("Emulation.setFocusEmulationEnabled", { enabled: true }); }
  await cmd("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }).catch(() => {});
  await cmd("Page.navigate", { url: "http://localhost:5173/" }); await sleep(1500);
  await ev(`sessionStorage.clear();localStorage.clear();localStorage.setItem('token',${JSON.stringify(A.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(A.user))});localStorage.setItem('cohle:tour:${A.user.id}','done');location.reload()`); await sleep(4500);

  // ---- lazy: the shop code is not part of what the chat downloads ----
  const early = await ev(`performance.getEntriesByType('resource').map(r=>r.name).filter(n=>/ShopModal|framer-motion|fx\\/(Snow|EffectsHost)/.test(n))`);
  ok("a Loja e os efeitos NÃO são baixados antes de precisar (chunks sob demanda)", early.length === 0, early.map((n) => n.split("/").pop()).join(", "));
  ok("botão Loja na barra lateral", !!(await ev(`!!document.querySelector('button[title="Loja"]')`)));
  await ev(`document.querySelector('button[title="Loja"]').click()`);
  ok("a Loja abre, com Preview Beta e o aviso de que no futuro alguns itens serão pagos", await waitFor(`/Preview Beta/i.test(document.body.innerText) && /Grátis durante o beta\\. No futuro alguns itens serão pagos\\./.test(document.body.innerText)`));
  ok("agora o código da Loja foi baixado (e só agora)", await loaded("/ShopModal/"));
  let tx = await text();
  ok("vitrine em destaque: Natal, Edição Limitada e dias restantes", /Natal/.test(tx) && /Edição Limitada · \d+ dias?/.test(tx));
  ok("cada item mostra o selo Preview Beta", (await ev(`[...document.querySelectorAll('[data-item]')].every(c=>/Preview Beta/i.test(c.innerText)) && document.querySelectorAll('[data-item]').length >= 4`)));
  ok("beta tester: o badge Beta Tester já é seu", (await http("/shop", null, A.token)).d.owned.length >= 1);
  await shot(`shop-1-vitrine-${TAG}`);

  // ---- claim, wear one piece ----
  await ev(`[...document.querySelectorAll('[data-item="natal.frame.garland"] button')].find(b=>/Pegar grátis/.test(b.innerText)).click()`);
  ok("'Pegar grátis (Beta)' pega o item", await waitFor(`/Equipar/.test(document.querySelector('[data-item="natal.frame.garland"]')?.innerText||'') && !/Pegar grátis/.test(document.querySelector('[data-item="natal.frame.garland"]')?.innerText||'')`));
  await ev(`[...document.querySelectorAll('[data-item="natal.frame.garland"] button')].find(b=>b.innerText.trim()==='Equipar').click()`);
  ok("equipar a moldura: o servidor passa a entregar a chave aos outros", await waitFor(`/Equipado/.test(document.querySelector('[data-item="natal.frame.garland"]')?.innerText||'')`) && (await http("/me", null, A.token)).d.fx?.frame === "natal.frame.garland");
  ok("a moldura aparece no meu avatar (sem recarregar)", await waitFor(`!!document.querySelector('.fx-frame svg.fx-art')`));
  ok("sem tema equipado, o app continua no tema normal e sem cenas", !(await ev(`document.documentElement.dataset.theme==='natal'`)) && !(await effects()).tree);

  // ---- collections: progress, whole set, bonus ----
  await tab("Coleções");
  const natalTxt = () => ev(`document.querySelector('[aria-label="Coleção Natal"]')?.innerText ?? ""`);
  ok("coleção Natal com progresso n/N", /[12]\/8 itens/.test(await natalTxt()), (await natalTxt()).match(/\d+\/8 itens/)?.[0]);
  ok("Halloween aparece como outra coleção, ainda 0/8", /0\/8 itens/.test(await ev(`document.querySelector('[aria-label="Coleção Halloween"]')?.innerText ?? ""`)));
  await clickIn("Natal", "Pegar o conjunto (Beta)");
  ok("pegar o conjunto completo leva a 8/8", await waitFor(`/8\\/8 itens/.test(document.querySelector('[aria-label="Coleção Natal"]')?.innerText ?? "")`, 30000));
  await clickIn("Natal", "Equipar conjunto completo");
  ok("equipar o conjunto completo libera o bônus (trenó extra)", await waitFor(`/Conjunto completo equipado: bônus liberado/.test(document.body.innerText)`) && (await http("/shop", null, A.token)).d.bonus === "natal.sleigh");
  ok("o tema de Natal é aplicado ao app", await waitFor(`document.documentElement.dataset.theme==='natal'`));
  await ev(`[...document.querySelectorAll('button[aria-label="Voltar"],button[aria-label="Fechar"]')][0].click()`); await sleep(800);
  ok("cena de Natal: luzes, árvore, neve e contagem regressiva", await waitFor(`document.querySelectorAll('.fx-lights').length===4 && !!document.querySelector('.fx-tree') && !!document.querySelector('[id^="fx-snow-"] canvas') && /Faltam \\d+ dias? para o Natal|Natal/.test(document.body.innerText)`, 15000), JSON.stringify(await effects()));
  ok("só agora o chunk de efeitos (neve) foi baixado", await loaded("/Snow/"));
  await shot(`shop-2-natal-${TAG}`);
  const snowCount = await ev(`(()=>{const c=document.querySelector('[id^="fx-snow-"] canvas');return c?c.width+'x'+c.height:null})()`);
  ok("a neve usa um único canvas", !!snowCount, String(snowCount));

  // the rule (CLAUDE.md): nothing crosses the screen or makes noise on its own; the corner icon does it when clicked
  await sleep(24000);
  ok("sem clique, nada cruza a tela e nenhum som toca (o trenó antigo vinha sozinho aos 20 s)", !(await ev(`!!document.querySelector('.fx-cross')`)) && (await ev(`window.__snd`)) === 0, `sons=${await ev(`window.__snd`)} ${(await ev(`window.__stk.slice(0,2).join(' ## ')`) ?? '').slice(0, 600)}`);
  ok("a árvore do canto é um botão clicável", !!(await ev(`!!document.querySelector('button.fx-tree[aria-label*="Papai Noel"]')`)));
  await ev(`document.querySelector('button.fx-tree').click()`);
  ok("clicou na árvore: o Papai Noel passa no trenó (barba, gorro e rena) e toca o som", await waitFor(`!!document.querySelector('.fx-cross svg path[fill="#fff"]') && !!document.querySelector('.fx-cross svg circle[fill="#f2d3b3"]')`, 6000) && (await ev(`window.__snd`)) > 0);
  ok("o trenó some sozinho depois de passar", await waitFor(`!document.querySelector('.fx-cross')`, 12000));
  await shot(`shop-2b-papai-noel-${TAG}`);

  // ---- the Loja as a sales window: banners, big preview, click-see-leave ----
  await ev(`document.querySelector('button[title="Loja"]').click()`); await sleep(1500); await tab("Coleções");
  const banners = await ev(`[...document.querySelectorAll('section[aria-label^="Coleção "]')].map(x=>x.getAttribute('aria-label').replace('Coleção ',''))`);
  ok("Coleções: banners de Natal, Halloween, Ano Novo, Auras, Hacker, Gamer, Barbearia e Rainha", ["Natal", "Halloween", "Ano Novo", "Auras", "Hacker", "Gamer", "Barbearia", "Rainha"].every((n) => banners.includes(n)), banners.join(","));
  ok("coleção completa vira faixa: 'Já é seu', 'Ativo' (equipada) e 8/8", await ev(`(()=>{const t=document.querySelector('[aria-label="Coleção Natal"]').innerText;return /Já é seu/i.test(t)&&/Ativo/i.test(t)&&/8\\/8 itens/.test(t)&&!/Neve caindo/.test(t)})()`));
  ok("banner de temporada que ainda não é seu vende: texto, edição limitada com dias e 'quem pegou, fica'", await ev(`(()=>{const t=document.querySelector('[aria-label="Coleção Halloween"]').innerText;return /Lua cheia/.test(t)&&/Edição Limitada · \\d+ dias?/.test(t)&&/Quem pegou, fica/.test(t)})()`));
  ok("banner mostra a arte real dos itens (moldura, nome, emblema, entrada, reações)", await ev(`(()=>{const sh=document.querySelector('[aria-label="Coleção Halloween"] [aria-label="O que vem no conjunto"]');return !!sh&&/moldura/i.test(sh.innerText)&&/emblema/i.test(sh.innerText)&&/entrada/i.test(sh.innerText)&&/rea[cç][oõ]es/i.test(sh.innerText)})()`));
  ok("banner das Auras mostra as 8 auras", (await ev(`document.querySelectorAll('[aria-label="Coleção Auras"] [aria-label="Todas as auras"] > div').length`)) === 8);
  await clickIn("Natal", "Ver prévia do conjunto");
  ok("'Ver prévia do conjunto' abre a prévia grande, com você usando o conjunto", await waitFor(`!!document.querySelector('[role=dialog][aria-label^="Prévia:"] [aria-label="Como fica em você"] .fx-frame')`, 6000));
  ok("a prévia toca a entrada sozinha ao abrir", await waitFor(`/Ho ho ho!/.test(document.querySelector('.fx-ent-text')?.innerText||'')`, 6000));
  await shot(`shop-2c-previa-${TAG}`);
  await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  ok("Esc fecha só a prévia (a Loja continua aberta)", await waitFor(`!document.querySelector('[role=dialog][aria-label^="Prévia:"]') && !!document.querySelector('[role=dialog][aria-label="Loja"]')`, 4000));
  await tab("Itens"); await click("Auras"); await sleep(800);
  await ev(`[...document.querySelectorAll('[data-item="aura.fire"]')][0]?.click()`); await sleep(300);
  ok("clicar num item abre a prévia dele", await waitFor(`!!document.querySelector('[role=dialog][aria-label="Prévia: Aura de Fogo"]')`, 5000));
  ok("prévia do item: aura animada no seu avatar", await ev(`!!document.querySelector('[aria-label="Prévia: Aura de Fogo"] .fx-frame.fx-live .fx-aura')`));
  await ev(`[...document.querySelectorAll('[aria-label="Prévia: Aura de Fogo"] button')].find(b=>/Sair/.test(b.innerText)).click()`);
  ok("'Sair' fecha a prévia", await waitFor(`!document.querySelector('[role=dialog][aria-label^="Prévia:"]')`, 4000));
  await ev(`[...document.querySelectorAll('button[aria-label="Voltar"],button[aria-label="Fechar"]')][0].click()`); await sleep(600);

  // ---- preferences switch everything off ----
  await ev(`document.querySelector('button[title="Loja"]').click()`); await sleep(1500); await tab("Preferências");
  await ev(`document.querySelector('button[role=switch][aria-label="Desligar efeitos"]').click()`); await sleep(900);
  ok("'Desligar efeitos' remove luzes, árvore e neve na hora", await waitFor(`document.querySelectorAll('.fx-lights').length===0 && !document.querySelector('.fx-tree') && !document.querySelector('[id^="fx-snow-"]')`));
  ok("a preferência vai para o servidor (outros aparelhos)", await waitFor(`true`) && (await (async () => { for (let i = 0; i < 20; i++) { if ((await http("/me/prefs", null, A.token)).d.effectsOff === true) return true; await sleep(300); } return false; })()));
  await ev(`document.querySelector('button[role=switch][aria-label="Desligar efeitos"]').click()`); await sleep(500);
  await ev(`[...document.querySelectorAll('[role=radio]')].find(b=>b.innerText==='Ligado').click()`); await sleep(900);
  ok("Modo leve 'Ligado' aplica a classe lite e desliga as cenas", (await ev(`document.documentElement.classList.contains('lite')`)) && (await effects()).lights === 0);
  await ev(`[...document.querySelectorAll('[role=radio]')].find(b=>b.innerText==='Automático').click()`); await sleep(700);
  ok("de volta ao Automático, as cenas voltam (aparelho normal)", (await ev(`!document.documentElement.classList.contains('lite')`)) && await waitFor(`document.querySelectorAll('.fx-lights').length===4`));

  // ---- filters and inventory ----
  await tab("Itens"); await click("Molduras");
  ok("filtro por tipo: só molduras (Natal, Halloween, 8 auras, Hacker, Gamer, Barbearia e Rainha)", await waitFor(`(()=>{const c=[...document.querySelectorAll('[data-item]')].map(x=>x.dataset.item);return c.length===20&&c.every(k=>/frame|aura/.test(k))})()`));
  await click("Todos"); await click("Épico"); await sleep(600);
  ok("filtro por raridade: só épicos", await waitFor(`(()=>{const c=[...document.querySelectorAll('[data-item]')];return c.length>=1&&c.every(x=>/Épico/i.test(x.innerText))})()`));
  await tab("Inventário"); ok("inventário lista o que eu tenho", (await ev(`document.querySelectorAll('[data-item]').length`)) >= 8);

  // ---- live preview of an entrance ("Ver ao vivo") ----
  await tab("Vitrine");
  await ev(`[...document.querySelectorAll('[data-item="natal.entrance.hohoho"] button')].find(b=>/Ver ao vivo/.test(b.innerText)).click()`);
  ok("'Ver ao vivo' mostra a entrada Ho ho ho na tela", await waitFor(`/Ho ho ho!/.test(document.querySelector('.fx-ent-text')?.innerText||'')`, 6000));
  ok("e a entrada some sozinha", await waitFor(`!document.querySelector('.fx-ent-text')`, 8000));
  await shot(`shop-3-preview-${TAG}`);
  await ev(`[...document.querySelectorAll('button[aria-label="Voltar"],button[aria-label="Fechar"]')][0].click()`); await sleep(600);

  // ---- someone with an entrance joins MY call: I see it (server-driven, over the socket) ----
  await ev(`[...document.querySelectorAll('button')].find(x=>x.getAttribute('title')==='${srv.name}'||x.innerText.includes(${JSON.stringify(srv.name)}))?.click()`); await sleep(1200);
  await click("Sala de voz", "button, a, div[role=button]"); await sleep(3000);
  const sb = io(API, { auth: { token: B.token }, transports: ["websocket"] }); await new Promise((r) => sb.on("connect", r)); sb.emit("voice:join", vch);
  ok("quando outra pessoa entra na minha sala com a entrada Ho ho ho, aparece na minha tela, com o nome de quem entrou", await waitFor(`(()=>{const t=document.querySelector('.fx-ent-text')?.innerText||'';return /Ho ho ho!/.test(t)&&t.includes('bia_${run}')&&/entrou na sala/.test(t)})()`, 14000));
  await sleep(3200);
  // giant reaction from B reaches me
  sb.emit("fx:giant", "gift"); await sleep(1800);
  ok("reação gigante de outra pessoa atravessa a minha tela", await waitFor(`!!document.querySelector('div.fixed[class*="z-[70]"] svg')`, 5000));
  await shot(`shop-4-chamada-${TAG}`);

  // ---- hidden tab: nothing keeps running ----
  await ev(`Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))`); await sleep(800);
  const hid = await effects();
  ok("com a aba oculta as cenas e a neve param (nada roda em segundo plano)", hid.lights === 0 && !hid.tree && !hid.canvas, JSON.stringify(hid));
  await ev(`Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))`); await sleep(800);
  ok("e voltam quando a aba volta", await waitFor(`document.querySelectorAll('.fx-lights').length===4`));
  sb.close();

  // ---- take the theme off: the old theme comes back ----
  await ev(`document.querySelector('button[title="Loja"]').click()`); await sleep(1500);
  await tab("Itens"); await ev(`[...document.querySelectorAll('[role=group][aria-label="Coleção"] button')].find(b=>b.innerText.trim()==='Natal')?.click()`); await sleep(800);          // the grid is virtualized: filter to the collection so the card is on screen
  ok("o card do tema equipado mostra 'Ativo'", await waitFor(`/Ativo/.test(document.querySelector('[data-item="natal.theme"]')?.innerText||'')`, 6000));
  await ev(`[...document.querySelectorAll('[data-item="natal.theme"] button')].find(b=>/Equipado/.test(b.innerText))?.click()`); await sleep(1500);
  ok("tirar o tema devolve o tema anterior", await waitFor(`document.documentElement.dataset.theme!=='natal'`));

  // ---- season ambient snow: on by default for people without a theme, light, and one switch away from off ----
  await http("/me/prefs", { seasonalAuto: true }, A.token, "PUT");
  await cmd("Page.navigate", { url: "http://localhost:5173/" }); await sleep(4500);
  ok("sem tema, na temporada, há neve leve de ambiente (só um canvas)", await waitFor(`document.querySelectorAll('[id^="fx-snow-"] canvas').length===1 && document.querySelectorAll('.fx-lights').length===0`, 12000));

  // ---- Halloween: a second season, a different scene, same switches ----
  await ev(`localStorage.setItem('token',${JSON.stringify(H.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(H.user))});localStorage.setItem('cohle:tour:${H.user.id}','done');location.reload()`); await sleep(4500);
  ok("Halloween: tema roxo e laranja aplicado", await waitFor(`document.documentElement.dataset.theme==='halloween'`, 12000));
  ok("Halloween: luzes laranja e roxas, abóbora no canto e contagem para o Halloween (sem neve)", await waitFor(`document.querySelectorAll('.fx-lights.hw').length===4 && !!document.querySelector('.fx-corner') && /para o Halloween|Halloween é amanhã|Hoje é Halloween|Feliz Halloween/.test(document.body.innerText) && !document.querySelector('[id^="fx-snow-"] canvas')`, 15000));
  await shot(`shop-6-halloween-${TAG}`);
  await ev(`window.__snd=0`); await sleep(22000);
  ok("Halloween: sem clique, nada cruza a tela e nenhum som toca", !(await ev(`!!document.querySelector('.fx-cross')`)) && (await ev(`window.__snd`)) === 0, `sons=${await ev(`window.__snd`)} ${(await ev(`window.__stk.slice(0,2).join(' ## ')`) ?? '').slice(0, 600)}`);
  await ev(`document.querySelector('button[aria-label*="bruxa"]').click()`);
  ok("Halloween: clicou na abóbora, a bruxa de vassoura passa e toca o som", await waitFor(`!!document.querySelector('.fx-cross svg circle[fill="#8bd17c"]')`, 6000) && (await ev(`window.__snd`)) > 0);
  await ev(`document.querySelector('button[title="Loja"]').click()`); await sleep(1500);
  ok("Halloween: a vitrine mostra as duas temporadas", await waitFor(`!!document.querySelector('[aria-label="Coleção Halloween"]') && !!document.querySelector('[aria-label="Coleção Natal"]')`, 8000));
  await ev(`[...document.querySelectorAll('[data-item="halloween.entrance.boo"] button')].find(b=>/Ver ao vivo/.test(b.innerText)).click()`);
  ok("Halloween: 'Ver ao vivo' mostra Buuu! com morcegos e fantasmas", await waitFor(`/Buuu!/.test(document.querySelector('.fx-ent-text')?.innerText||'')`, 6000));
  await shot(`shop-7-buuu-${TAG}`);
  await ev(`[...document.querySelectorAll('button[aria-label="Voltar"],button[aria-label="Fechar"]')][0].click()`); await sleep(500);
  await ev(`localStorage.setItem('token',${JSON.stringify(A.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(A.user))});location.reload()`); await sleep(4000);

  // ---- a theme without a season (Hacker): nothing on its own, the terminal icon in the corner does the animation + sound ----
  await ev(`localStorage.setItem('token',${JSON.stringify(X.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(X.user))});localStorage.setItem('cohle:tour:${X.user.id}','done');location.reload()`); await sleep(4500);
  ok("Hacker: tema verde de terminal aplicado, com luzes verdes e o terminal no canto", await waitFor(`document.documentElement.dataset.theme==='hacker' && document.querySelectorAll('.fx-lights').length===4 && !!document.querySelector('button.fx-corner')`, 12000));
  await ev(`window.__snd=0;window.__stk.length=0`); await sleep(8000);
  ok("Hacker: sem clique, nada aparece nem toca", !(await ev(`!!document.querySelector('.fx-ent-text')`)) && (await ev(`window.__snd`)) === 0, `sons=${await ev(`window.__snd`)} ${(await ev(`window.__stk.slice(0,2).join(' ## ')`) ?? '').slice(0, 600)}`);
  await ev(`document.querySelector('button.fx-corner').click()`);
  ok("Hacker: clicou no terminal, sai a animação com som", await waitFor(`/sudo hack/.test(document.querySelector('.fx-ent-text')?.innerText||'')`, 5000) && (await ev(`window.__snd`)) > 0);
  await shot(`shop-8-hacker-${TAG}`);
  await ev(`localStorage.setItem('token',${JSON.stringify(A.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(A.user))});location.reload()`); await sleep(4000);

  // ---- Ano Novo: gold theme, the bottle in the corner; fireworks only when it is clicked ----
  await ev(`localStorage.setItem('token',${JSON.stringify(N.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(N.user))});localStorage.setItem('cohle:tour:${N.user.id}','done');location.reload()`); await sleep(4500);
  ok("Ano Novo: tema dourado, luzes douradas, garrafa no canto e contagem para a virada", await waitFor(`document.documentElement.dataset.theme==='anonovo' && document.querySelectorAll('.fx-lights').length===4 && !!document.querySelector('button.fx-corner') && /para 20\\d\\d|20\\d\\d começa amanhã|Feliz 20\\d\\d/.test(document.body.innerText)`, 14000));
  await ev(`window.__snd=0;window.__stk.length=0`); await sleep(9000);
  ok("Ano Novo: sem clique, nenhum fogo aparece e nenhum som toca", !(await ev(`!!document.querySelector('[data-fireworks]')`)) && (await ev(`window.__snd`)) === 0);
  await ev(`document.querySelector('button.fx-corner').click()`);
  ok("Ano Novo: clicou na garrafa, os fogos estouram, aparece 'Feliz Ano Novo!' e toca o som", await waitFor(`!!document.querySelector('[data-fireworks]') && /Feliz Ano Novo/.test(document.querySelector('.fx-ent-text')?.innerText||'')`, 5000) && (await ev(`window.__snd`)) > 0);
  await shot(`shop-9-fogos-${TAG}`);
  ok("os fogos somem sozinhos depois de estourar", await waitFor(`!document.querySelector('[data-fireworks]')`, 8000));
  await ev(`localStorage.setItem('token',${JSON.stringify(A.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(A.user))});location.reload()`); await sleep(4000);

  // ---- phone size ----
  if (!ATTACH) {
    await cmd("Emulation.setDeviceMetricsOverride", { width: 390, height: 800, deviceScaleFactor: 2, mobile: true }); await sleep(900);
    ok("celular: a Loja não rola para o lado", await noSide()); await shot(`shop-5-celular-${TAG}`);
  }
  ok("sem erros de JavaScript", errors.length === 0, errors.slice(0, 2).join(" | ").slice(0, 240));
} finally { ws.close(); chrome?.kill(); await prisma.collection.update({ where: { key: "anonovo" }, data: { inicio: nyOrig.inicio, fim: nyOrig.fim } }).catch(() => {}); await prisma.$disconnect(); }
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
