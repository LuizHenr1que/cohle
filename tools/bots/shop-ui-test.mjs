// The Loja in the real client. Chrome (default, headless, CDP 9361) or the desktop app: ATTACH=9341. Dev API (EMAIL_DEV=1, log in SERVER_LOG) + vite :5173.
import { spawn } from "node:child_process"; import { mkdtempSync, writeFileSync, readFileSync } from "node:fs"; import { tmpdir } from "node:os";
import { io } from "../bots/node_modules/socket.io-client/build/esm/index.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", OUT = process.env.SHOTS ?? tmpdir(), LOG = process.env.SERVER_LOG, ATTACH = process.env.ATTACH, TAG = ATTACH ? "desktop" : "web";
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  [${TAG}] ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const last = (re) => [...readFileSync(LOG, "utf8").matchAll(re)].at(-1)?.[1];
const run = Date.now().toString(36).slice(-6);
const mk = async (name) => { const email = `${name}.${run}@cohle.dev`; const r = await http("/auth/register", { email, username: `${name}_${run}`, password: "senhaSegura123" }); if (r.d.token) return r.d; await sleep(500); return (await http("/auth/verify", { email, code: last(/Seu código do Cohle: (\d{6})/g) })).d; };
const A = await mk("ana"), B = await mk("bia"), H = await mk("hel");
const owner = (await http("/auth/login", { email: "teste1@cohle.dev", password: "teste12345" })).d;
const srv = (await http("/servers", { name: "Loja UI " + run }, owner.token)).d, vch = srv.channels.find((c) => c.type === "VOICE").id;
await http(`/servers/join/${srv.inviteCode}`, {}, A.token); await http(`/servers/join/${srv.inviteCode}`, {}, B.token);
// B owns and wears the whole Natal set (entrance included), A starts with nothing
const shB = (await http("/shop", null, B.token)).d; for (const it of shB.items) await http(`/shop/items/${it.id}/claim`, {}, B.token);
await http("/shop/equipped/set", { collectionId: shB.collections.find((c) => c.key === "natal").id }, B.token);

await http("/me/prefs", { seasonalAuto: false }, A.token, "PUT");      // the season's ambient snow would load the effects chunk on its own; first prove the shop stays lazy without it
// H wears the whole Halloween set from the start
const shH = (await http("/shop", null, H.token)).d; for (const it of shH.items.filter((i) => i.key.startsWith("halloween."))) await http(`/shop/items/${it.id}/claim`, {}, H.token);
await http("/shop/equipped/set", { collectionId: shH.collections.find((c) => c.key === "halloween").id }, H.token);
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
  await ev(`document.querySelector('[data-item="natal.frame.garland"] button.grad, [data-item="natal.frame.garland"] button').click()`);
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

  ok("o Papai Noel aparece no trenó que cruza a tela (barba, gorro e rena)", await waitFor(`!!document.querySelector('.fx-cross svg path[fill="#fff"]') && !!document.querySelector('.fx-cross svg circle[fill="#f2d3b3"]')`, 40000));
  await shot(`shop-2b-papai-noel-${TAG}`);

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
  ok("filtro por tipo: só molduras (2 de Natal e 2 de Halloween)", await waitFor(`(()=>{const c=[...document.querySelectorAll('[data-item]')].map(x=>x.dataset.item);return c.length===4&&c.every(k=>k.includes('frame'))})()`));
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
  ok("Halloween: a bruxa de vassoura cruza a tela", await waitFor(`!!document.querySelector('.fx-cross svg circle[fill="#8bd17c"]')`, 40000));
  await ev(`document.querySelector('button[title="Loja"]').click()`); await sleep(1500);
  ok("Halloween: a vitrine mostra as duas temporadas", await waitFor(`!!document.querySelector('[aria-label="Coleção Halloween"]') && !!document.querySelector('[aria-label="Coleção Natal"]')`, 8000));
  await ev(`[...document.querySelectorAll('[data-item="halloween.entrance.boo"] button')].find(b=>/Ver ao vivo/.test(b.innerText)).click()`);
  ok("Halloween: 'Ver ao vivo' mostra Buuu! com morcegos e fantasmas", await waitFor(`/Buuu!/.test(document.querySelector('.fx-ent-text')?.innerText||'')`, 6000));
  await shot(`shop-7-buuu-${TAG}`);
  await ev(`[...document.querySelectorAll('button[aria-label="Voltar"],button[aria-label="Fechar"]')][0].click()`); await sleep(500);
  await ev(`localStorage.setItem('token',${JSON.stringify(A.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(A.user))});location.reload()`); await sleep(4000);

  // ---- phone size ----
  if (!ATTACH) {
    await cmd("Emulation.setDeviceMetricsOverride", { width: 390, height: 800, deviceScaleFactor: 2, mobile: true }); await sleep(900);
    ok("celular: a Loja não rola para o lado", await noSide()); await shot(`shop-5-celular-${TAG}`);
  }
  ok("sem erros de JavaScript", errors.length === 0, errors.slice(0, 2).join(" | ").slice(0, 240));
} finally { ws.close(); chrome?.kill(); }
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
