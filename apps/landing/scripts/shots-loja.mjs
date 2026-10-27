// Takes the Loja screenshots of the landing (apps/landing/shots/loja-*.jpg) from the REAL app running on the dev stack.
//   needs: dev API on :3001 (EMAIL_DEV=1, log in SERVER_LOG), vite on :5173, Chrome, ffmpeg, the dev database (Prisma) to give demo items.
//   SERVER_LOG=/path/server.log node apps/landing/scripts/shots-loja.mjs
import { spawn, execFileSync } from "node:child_process"; import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "node:fs"; import { tmpdir } from "node:os"; import { createRequire } from "node:module";
import { io } from "../../../tools/bots/node_modules/socket.io-client/build/esm/index.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const req = createRequire(import.meta.url);
const { PrismaClient } = req("../../server/node_modules/@prisma/client");
const env = Object.fromEntries(readFileSync(new URL("../../server/.env", import.meta.url), "utf8").split("\n").map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]));
if (!/schema=dev/.test(env.DATABASE_URL)) throw new Error("só no schema de desenvolvimento");
const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
const API = "http://localhost:3001", LOG = process.env.SERVER_LOG, OUT = new URL("../shots/", import.meta.url).pathname, TMP = mkdtempSync(tmpdir() + "/lj-"); mkdirSync(OUT, { recursive: true });
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const run = Date.now().toString(36).slice(-5);
const mk = async (handle, display) => { const email = `${handle}.${run}@cohle.dev`; let u = (await http("/auth/register", { email, username: `${handle}_${run}`, password: "senhaSegura123" })).d; if (!u.token) { await sleep(700); const code = [...readFileSync(LOG, "utf8").matchAll(/Seu código do Cohle: (\d{6})/g)].at(-1)?.[1]; u = (await http("/auth/verify", { email, code })).d; } await http("/me", { displayName: display }, u.token, "PATCH"); return u; };

// ---- cast, servers, messages ----
const mia = await mk("mia", "Mia"), caio = await mk("caio", "Caio"), duda = await mk("duda", "Duda"), leo = await mk("leo", "Leo"), visit = await mk("visita", "Visitante");
const sv = (n, tok) => http("/servers", { name: n }, tok).then((r) => r.d);
const main = await sv("Galera do Jogo", mia.token);
for (const u of [caio, duda, leo]) await http(`/servers/join/${main.inviteCode}`, {}, u.token);
const others = []; for (const n of ["Campeonato", "Estudos", "Trabalho", "Família", "Bairro"]) others.push(await sv(n, mia.token));
// items: everybody owns every item (demo), then wears a few
const items = await prisma.shopItem.findMany({ where: { ativo: true } });          // only the seasons really running show on the storefront (Ano Novo starts 20 Dec)
for (const u of [mia, caio, duda, leo]) await prisma.userItem.createMany({ data: items.map((i) => ({ userId: u.user.id, itemId: i.id, source: "demo" })), skipDuplicates: true });
const by = (k) => items.find((i) => i.key === k).id;
const wear = (u, o) => Promise.all(Object.entries(o).map(([slot, k]) => http("/shop/equipped", { slot, itemId: k ? by(k) : null }, u.token, "PUT")));
await wear(caio, { frame: "aura.fire", name_effect: "gamer.name.neon", badge: "gamer.badge.player1" });
await wear(duda, { frame: "aura.sakura", name_effect: "queen.name.rose", badge: "queen.badge.crown" });
await wear(leo, { frame: "hacker.frame.code", name_effect: "hacker.name.glitch", badge: "hacker.badge.root" });
const ch = main.channels.find((c) => c.type === "TEXT").id;
const say = async (u, txt) => { const s = io(API, { auth: { token: u.token }, transports: ["websocket"] }); await new Promise((r) => s.on("connect", r)); s.emit("channel:join", ch); await sleep(400); s.emit("message:send", { channelId: ch, content: txt }, () => {}); await sleep(900); s.close(); };
await say(caio, "bora jogar hoje à noite?"); await say(duda, "eu entro depois das 20h, guarda uma vaga pra mim"); await say(mia, "fechado! já tô com a aura nova"); await say(leo, "a Loja nova ficou demais, olha meu nome");

// ---- browser ----
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--remote-debugging-port=9366", `--user-data-dir=${TMP}/p`, "--window-size=1440,900", "--no-first-run", "about:blank"], { stdio: "ignore" });
let t; for (let i = 0; i < 40 && !t; i++) { await sleep(300); try { t = (await (await fetch("http://localhost:9366/json")).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) w.get(m.id)?.(m.result); };
const cmd = (method, params) => new Promise((rr) => { const i = ++id; w.set(i, rr); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const waitFor = async (fn, ms = 10000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(fn)) return true; await sleep(250); } return false; };
const shot = async (name, wait = 1200) => { await sleep(wait); const png = `${TMP}/${name}.png`; writeFileSync(png, Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).data, "base64")); execFileSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-q:v", "4", `${OUT}loja-${name}.jpg`]); console.log("ok", name); };
const login = async (u, opts = {}) => { await cmd("Page.navigate", { url: "http://localhost:5173/" }); await sleep(1200); await ev(`sessionStorage.clear();localStorage.clear();localStorage.setItem('token',${JSON.stringify(u.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(u.user))});localStorage.setItem('cohle:tour:${u.user.id}','done');${opts.rail ? "localStorage.setItem('cohle:rail','open');" : ""}location.reload()`); await sleep(5000); };
const tab = async (n) => { await ev(`[...document.querySelectorAll('[role=tab]')].find(b=>b.innerText.includes(${JSON.stringify(n)}))?.click()`); await sleep(1000); };
const openShop = async () => { await ev(`document.querySelector('button[title="Loja"]').click()`); await waitFor(`/Preview Beta/i.test(document.body.innerText)`); await sleep(1500); };
const scrollTo = async (label) => { await ev(`document.querySelector('[aria-label="Coleção ${label}"]')?.scrollIntoView({block:'start'})`); await sleep(700); };
const openChat = async () => { await ev(`[...document.querySelectorAll('nav button')].find(b=>b.getAttribute('title')==='Galera do Jogo')?.click()`); await sleep(1200); await ev(`[...document.querySelectorAll('aside button')].find(b=>b.innerText.includes('geral'))?.click()`); await waitFor(`/guarda uma vaga/.test(document.body.innerText)`, 12000); await sleep(1000); };
try {
  await cmd("Page.enable"); await cmd("Runtime.enable"); await cmd("Emulation.setFocusEmulationEnabled", { enabled: true });
  await cmd("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1.25, mobile: false });
  // 1-4: the storefront as someone who owns nothing (full sales banners)
  await login(visit); await openShop(); await shot("vitrine");
  await tab("Coleções"); await scrollTo("Auras"); await shot("auras");
  await scrollTo("Gamer"); await shot("colecoes");
  await ev(`[...document.querySelectorAll('[aria-label="Coleção Gamer"] button')].find(b=>b.innerText.includes('Ver prévia'))?.click()`); await sleep(1300); await shot("previa", 600);
  // 5-7: themes in the real chat
  for (const [name, col, set] of [["natal", "natal", { theme: "natal.theme", frame: "natal.frame.garland", name_effect: "natal.name.lights", badge: "natal.badge.spirit", entrance: "natal.entrance.hohoho" }], ["halloween", "halloween", { theme: "halloween.theme", frame: "halloween.frame.pumpkin", name_effect: "halloween.name.pumpkin", badge: "halloween.badge.spooky", entrance: "halloween.entrance.boo" }], ["hacker", "hacker", { theme: "hacker.theme", frame: "hacker.frame.code", name_effect: "hacker.name.terminal", badge: "hacker.badge.root", entrance: "hacker.entrance.access" }]]) {
    await wear(mia, set); await login(mia); await openChat(); await shot(name, 1500);
  }
  // 8: servers in groups
  await wear(mia, { theme: null, frame: "aura.gold", name_effect: "barber.name.gold", badge: null, entrance: null });
  const sid = (n) => (n === "Galera do Jogo" ? main : others.find((o) => o.name === n)).id;
  await http("/me/prefs", { serverGroups: [{ id: "g1", name: "Jogos", color: "#b57bff", serverIds: [sid("Galera do Jogo"), sid("Campeonato")], open: true }, { id: "g2", name: "Vida real", color: "#3ddc84", serverIds: [sid("Estudos"), sid("Trabalho"), sid("Família")], open: false }] }, mia.token, "PUT");
  await login(mia, { rail: true }); await openChat(); await shot("grupos", 1200);
} finally {
  ws.close(); chrome.kill();
  await prisma.$disconnect();
}
console.log("prontas em", OUT);
