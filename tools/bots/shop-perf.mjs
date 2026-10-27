// Cost of the Loja's effects on the WEB client, measured on the PRODUCTION bundle (vite preview :5191, dev API :3001, never the real server).
// Idle CPU / JS time / heap / frames per second / long tasks for: nothing equipped, the season's ambient snow, the full Natal scene, the scene under a 4x slower CPU,
// (absolute CPU depends on what else the machine is doing, so the budget compares with the base measured in the same run) a hidden tab, and "effects off". Budget (CLAUDE.md, plan): scene idle CPU <= 3% on desktop, hidden tab ~0%, >= 30 fps at 4x CPU slowdown.
import { spawn } from "node:child_process"; import { mkdtempSync } from "node:fs"; import { tmpdir } from "node:os";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); const API = "http://localhost:3001", WEB = process.env.WEB ?? "http://localhost:5191";
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const u = (await http("/auth/login", { email: "teste2@cohle.dev", password: "teste12345" })).d;
// the Loja is locked: the owner account gives the test user every item as a gift
const own = (await http("/auth/login", { email: "teste1@cohle.dev", password: "teste12345" })).d, cat = (await http("/shop/admin/catalog", null, own.token)).d;
for (let i = 0; i < cat.items.length; i += 80) await http("/shop/gifts", { to: "@teste2", itemIds: cat.items.slice(i, i + 80).map((x) => x.id) }, own.token);
const sh = (await http("/shop", null, u.token)).d; await http("/shop/gifts/seen", {}, u.token);
const by = (k) => sh.items.find((i) => i.key === k).id;
const SLOTS = [["theme", "natal.theme"], ["frame", "natal.frame.garland"], ["name_effect", "natal.name.lights"], ["badge", "natal.badge.spirit"], ["entrance", "natal.entrance.hohoho"]];
const equip = async (on) => { for (const [slot, k] of SLOTS) await http("/shop/equipped", { slot, itemId: on ? by(k) : null }, u.token, "PUT"); };
const prefs = (p) => http("/me/prefs", p, u.token, "PUT");
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--remote-debugging-port=9363", `--user-data-dir=${mkdtempSync(tmpdir() + "/sp-")}`, "--window-size=1280,860", "--no-first-run", "about:blank"], { stdio: "ignore" });
let t; for (let i = 0; i < 40 && !t; i++) { await sleep(300); try { t = (await (await fetch("http://localhost:9363/json")).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) w.get(m.id)?.(m.result); };
const cmd = (method, params) => new Promise((rr) => { const i = ++id; w.set(i, rr); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const metrics = async () => Object.fromEntries((await cmd("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
const f = (n) => n.toFixed(1);
// idle CPU + JS time + heap over `sec` seconds, frames per second (rAF count) and long tasks (>50 ms) in the same window
async function measure(sec) {
  await ev(`window.__fr=0;window.__lt=0;(function tick(){window.__fr++;window.__raf=requestAnimationFrame(tick)})();try{new PerformanceObserver(l=>{window.__lt+=l.getEntries().length}).observe({entryTypes:['longtask']})}catch{}`);
  const m0 = await metrics(); await sleep(sec * 1000); const m1 = await metrics();
  const fr = await ev(`cancelAnimationFrame(window.__raf);[window.__fr,window.__lt]`); const dt = m1.Timestamp - m0.Timestamp;
  return { cpu: (100 * (m1.TaskDuration - m0.TaskDuration)) / dt, script: (100 * (m1.ScriptDuration - m0.ScriptDuration)) / dt, heap: m1.JSHeapUsedSize / 1048576, fps: fr[0] / dt, longTasks: fr[1] };
}
const show = (name, r) => console.log(`${name.padEnd(46)} CPU ${f(r.cpu).padStart(5)}% · JS ${f(r.script).padStart(5)}% · ${f(r.fps).padStart(4)} fps · ${r.longTasks} tarefas longas · heap ${f(r.heap)} MB`);
const load = async () => { await cmd("Page.navigate", { url: WEB + "/" }); await sleep(800);
  await ev(`localStorage.clear();localStorage.setItem('token',${JSON.stringify(u.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(u.user))});localStorage.setItem('cohle:tour:${u.user.id}','done');location.reload()`); await sleep(5500); };
const out = {};
try {
  await cmd("Emulation.setFocusEmulationEnabled", { enabled: true });                      // headless has no focus; the snow (rightly) stops without it
  await cmd("Performance.enable"); await cmd("Page.enable"); await cmd("Runtime.enable"); await cmd("Network.enable");
  let bytes = 0, files = 0; const urls = new Map();
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.method === "Network.requestWillBeSent") urls.set(m.params.requestId, m.params.request.url); if (m.method === "Network.loadingFinished" && (urls.get(m.params.requestId) ?? "").startsWith(WEB)) { bytes += m.params.encodedDataLength; files++; } });

  await equip(false); await prefs({ seasonalAuto: false, effectsOff: false, lite: "auto" }); await load();
  out.none = await measure(8); show("sem itens, sem neve (base)", out.none);
  const chunksBase = await ev(`performance.getEntriesByType('resource').map(r=>r.name.split('/').pop()).filter(n=>/Snow|EffectsHost|ShopModal/.test(n)).join(',')`);
  console.log(`  chunks de efeito baixados na base: ${chunksBase || "nenhum"}`);

  await prefs({ seasonalAuto: true }); await load(); out.ambient = await measure(8); show("neve leve de ambiente (temporada)", out.ambient);

  await equip(true); await load();
  const on = await ev(`({ lights: document.querySelectorAll(".fx-lights").length, tree: !!document.querySelector(".fx-tree"), snow: !!document.querySelector('[id^="fx-snow-"] canvas') })`); console.log("  cena na tela:", JSON.stringify(on)); if (!(on.lights === 4 && on.tree && on.snow)) throw new Error("a cena não apareceu: a medição não vale");
  out.scene = await measure(10); show("cena de Natal completa (neve+luzes+árvore)", out.scene);
  await cmd("Emulation.setCPUThrottlingRate", { rate: 4 }); out.slow = await measure(8); show("cena de Natal, CPU 4x mais lenta", out.slow); await cmd("Emulation.setCPUThrottlingRate", { rate: 1 });
  await ev(`Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))`); await sleep(1200);
  out.hidden = await measure(6); show("cena de Natal, aba oculta", out.hidden);
  await ev(`Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))`);
  await prefs({ effectsOff: true }); await load(); out.off = await measure(8); show("cena equipada mas 'Desligar efeitos'", out.off);
  await prefs({ effectsOff: false }); await load();
  await ev(`document.querySelector('button[title="Loja"]')?.click()`); await sleep(3000); out.shop = await measure(6); show("Loja aberta (vitrine, com a cena ao fundo)", out.shop);

  // gates on JS time and long tasks (stable); total CPU is printed above but depends on what else the machine runs, so it informs and does not gate
  // the costliest aura case: your avatar with a LIVE aura (fire: flames flickering, embers orbiting) in a call tile, against the same call with no aura
  const inCall = async () => { await ev(`[...document.querySelectorAll('button')].find(b=>b.getAttribute('title')==='Servidor de Teste'||b.innerText.includes('Servidor de Teste'))?.click()`); await sleep(900); await ev(`[...document.querySelectorAll('button, a, div[role=button]')].find(b=>b.innerText.includes('Sala de voz'))?.click()`); await sleep(5000); };
  await equip(false); await prefs({ effectsOff: false, seasonalAuto: false }); await load(); await inCall(); out.callPlain = await measure(8); show("chamada, avatar SEM aura", out.callPlain);
  await http("/shop/equipped", { slot: "frame", itemId: by("aura.fire") }, u.token, "PUT"); await load(); await inCall();
  const live = await ev(`!!document.querySelector('.fx-frame.fx-live .fx-aura')`); console.log("  aura ao vivo na tela:", live); if (!live) throw new Error("a aura não apareceu na chamada: a medição não vale");
  out.callAura = await measure(8); show("chamada, avatar com AURA DE FOGO ao vivo", out.callAura);
  // an equipped pet sitting still must cost nothing (it only reacts to hover/click)
  await http("/shop/equipped", { slot: "frame", itemId: null }, u.token, "PUT"); await http("/shop/equipped", { slot: "pet", itemId: by("pet.dragon") }, u.token, "PUT"); await load();
  const hasPet = await ev(`!!document.querySelector('button[data-pet="pet.dragon"]')`); console.log("  pet na tela:", hasPet); if (!hasPet) throw new Error("o pet não apareceu: a medição não vale");
  out.pet = await measure(8); show("pet equipado, parado", out.pet);
  const pass = [["cena: JS <= 1,5%", out.scene.script <= 1.5], ["neve de ambiente: JS <= 1%", out.ambient.script <= 1], ["aba oculta: JS ~ 0 (<= 0,3%)", out.hidden.script <= 0.3], ["efeitos desligados: JS ~ base (+0,3 p.p.)", out.off.script <= out.none.script + 0.3],
    ["cena com CPU 4x mais lenta: sem travar (<= 3 tarefas longas)", out.slow.longTasks <= 3], [">= 30 fps com CPU 4x mais lenta", out.slow.fps >= 30], ["aura de fogo ao vivo na chamada: JS <= base da chamada + 1 p.p.", out.callAura.script <= out.callPlain.script + 1], ["aura ao vivo: sem tarefas longas", out.callAura.longTasks <= out.callPlain.longTasks + 1], ["pet parado: JS ~ base (+0,3 p.p.) e sem tarefas longas", out.pet.script <= out.none.script + 0.3 && out.pet.longTasks === 0]];
  console.log(`\nDownload do app (produção, sem gzip do servidor de teste): ${files} arquivos, ${(bytes / 1024).toFixed(0)} KB`);
  for (const [n, ok] of pass) console.log(`${ok ? "PASS" : "FAIL"}  ${n}`);
  process.exitCode = pass.every((x) => x[1]) ? 0 : 1;
} finally { await equip(false).catch(() => {}); for (const slot of ["pet", "status", "banner"]) await http("/shop/equipped", { slot, itemId: null }, u.token, "PUT").catch(() => {}); ws.close(); chrome.kill(); }
