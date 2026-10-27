// Folders of servers in the side rail (Chrome, CDP 9365; or the desktop app with ATTACH=9341). Dev API (EMAIL_DEV=1, log in SERVER_LOG) + vite :5173.
import { spawn } from "node:child_process"; import { mkdtempSync, writeFileSync, readFileSync } from "node:fs"; import { tmpdir } from "node:os";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", OUT = process.env.SHOTS ?? tmpdir(), LOG = process.env.SERVER_LOG, ATTACH = process.env.ATTACH, TAG = ATTACH ? "desktop" : "web";
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  [${TAG}] ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const run = Date.now().toString(36).slice(-6);
const email = `grp.${run}@cohle.dev`; let U = (await http("/auth/register", { email, username: `grp_${run}`, password: "senhaSegura123" })).d;
if (!U.token) { await sleep(600); const code = [...readFileSync(LOG, "utf8").matchAll(/Seu código do Cohle: (\d{6})/g)].at(-1)?.[1]; U = (await http("/auth/verify", { email, code })).d; }
const names = ["Jogos A", "Jogos B", "Trabalho", "Amigos", "Estudo"]; const S = [];
for (const n of names) S.push((await http("/servers", { name: `${n} ${run}` }, U.token)).d);

let t; if (ATTACH) t = (await (await fetch(`http://localhost:${ATTACH}/json`)).json()).find((x) => x.type === "page" && x.url.startsWith("http://localhost:5173"));
const chrome = ATTACH ? null : spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--remote-debugging-port=9365", `--user-data-dir=${mkdtempSync(tmpdir() + "/sg-")}`, "--window-size=1280,900", "--no-first-run", "about:blank"], { stdio: "ignore" });
for (let i = 0; i < 40 && !t; i++) { await sleep(300); try { t = (await (await fetch("http://localhost:9365/json")).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); const errors = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) w.get(m.id)?.(m.result); else if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text); };
const cmd = (method, params) => new Promise((rr) => { const i = ++id; w.set(i, rr); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const waitFor = async (fn, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(fn)) return true; await sleep(200); } return false; };
const setVal = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(v)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
const shot = async (f) => { await sleep(700); writeFileSync(`${OUT}/${f}.png`, Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).data, "base64")); };
const railTitles = () => ev(`[...document.querySelectorAll('nav button[title]')].map(b=>b.title)`);
const prefsGroups = async () => (await http("/me/prefs", null, U.token)).d.serverGroups;
const load = async () => { await cmd("Page.navigate", { url: "http://localhost:5173/" }); await sleep(1200); await ev(`localStorage.clear();localStorage.setItem('token',${JSON.stringify(U.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(U.user))});localStorage.setItem('cohle:tour:${U.user.id}','done');localStorage.setItem('cohle:rail','open');location.reload()`); await sleep(4500); };
try {
  await cmd("Runtime.enable"); await cmd("Page.enable"); if (ATTACH) await cmd("Emulation.setFocusEmulationEnabled", { enabled: true });
  await cmd("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }).catch(() => {});
  await load();
  ok("sem grupos: os 5 servidores aparecem soltos e há o botão 'Novo grupo'", (await railTitles()).filter((x) => names.some((n) => x.startsWith(n))).length === 5 && !!(await ev(`!!document.querySelector('button[aria-label="Novo grupo de servidores"]')`)));
  // ---- create a group through the modal ----
  await ev(`document.querySelector('button[aria-label="Novo grupo de servidores"]').click()`);
  ok("'Novo grupo' abre a janela com nome, cores e a lista de servidores", await waitFor(`!!document.querySelector('input[aria-label="Nome do grupo"]') && document.querySelectorAll('ul li button[aria-pressed]').length >= 5`));
  ok("não salva sem nome (botão desabilitado)", await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Criar grupo').disabled`));
  await setVal('input[aria-label="Nome do grupo"]', "Jogos");
  await ev(`[...document.querySelectorAll('ul li button[aria-pressed]')].filter(b=>/Jogos [AB]/.test(b.innerText)).forEach(b=>b.click())`);
  await ev(`document.querySelector('[role=radio][aria-label="Cor #ff8a3d"]').click()`);
  await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Criar grupo').click()`);
  ok("o grupo aparece na barra com a contagem de servidores", await waitFor(`!!document.querySelector('[role=group][aria-label="Grupo Jogos"]') && /2/.test(document.querySelector('[role=group][aria-label="Grupo Jogos"] button[aria-expanded]').innerText)`));
  ok("os 2 servidores do grupo saíram da lista solta (3 soltos)", (await ev(`[...document.querySelectorAll('nav > div:not([role=group]) > button[title]')].filter(b=>/ \\w+$/.test(b.title)).length`)) >= 3 && (await ev(`document.querySelectorAll('[role=group][aria-label="Grupo Jogos"] button[title^="Jogos "]').length`)) === 2);
  const saved = await (async () => { for (let i = 0; i < 20; i++) { const g = await prefsGroups(); if (g.length) return g; await sleep(300); } return []; })();
  ok("o grupo fica salvo na conta (vale em qualquer aparelho)", saved.length === 1 && saved[0].name === "Jogos" && saved[0].color === "#ff8a3d" && saved[0].serverIds.length === 2, JSON.stringify(saved));
  await shot(`groups-1-criado-${TAG}`);
  // ---- collapse / expand ----
  await ev(`document.querySelector('[role=group][aria-label="Grupo Jogos"] button[aria-expanded]').click()`);
  ok("recolher esconde os servidores do grupo", await waitFor(`document.querySelectorAll('[role=group][aria-label="Grupo Jogos"] button[title^="Jogos "]').length === 0 && document.querySelector('[role=group][aria-label="Grupo Jogos"] button[aria-expanded]').getAttribute('aria-expanded') === 'false'`));
  ok("o estado recolhido também é salvo", await (async () => { for (let i = 0; i < 20; i++) { if ((await prefsGroups())[0]?.open === false) return true; await sleep(300); } return false; })());
  // ---- the group survives a reload (from the account) ----
  await ev(`localStorage.removeItem('cohle:prefs')`); await load();
  ok("depois de recarregar (sem cache local) o grupo continua, recolhido", await waitFor(`!!document.querySelector('[role=group][aria-label="Grupo Jogos"]') && document.querySelector('[role=group][aria-label="Grupo Jogos"] button[aria-expanded]').getAttribute('aria-expanded')==='false'`, 10000));
  await ev(`document.querySelector('[role=group][aria-label="Grupo Jogos"] button[aria-expanded]').click()`); await sleep(500);
  // ---- context menu: move a server into the group, then out ----
  await ev(`document.querySelector('nav button[title^="Trabalho "]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:120,clientY:300}))`);
  ok("clique direito num servidor abre 'Mover para' com o grupo e 'Novo grupo com este servidor'", await waitFor(`!!document.querySelector('[role=menu]') && /Jogos/.test(document.querySelector('[role=menu]').innerText) && /Novo grupo com este servidor/.test(document.querySelector('[role=menu]').innerText)`));
  await ev(`[...document.querySelectorAll('[role=menuitem]')].find(b=>/Jogos/.test(b.innerText)).click()`);
  ok("mover pelo menu coloca o servidor no grupo (agora 3)", await waitFor(`document.querySelectorAll('[role=group][aria-label="Grupo Jogos"] button[title^="Trabalho "]').length===1`));
  await ev(`document.querySelector('nav button[title^="Trabalho "]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:120,clientY:300}))`);
  await ev(`[...document.querySelectorAll('[role=menuitem]')].find(b=>/Tirar do grupo/.test(b.innerText)).click()`);
  ok("'Tirar do grupo' devolve o servidor para a lista solta", await waitFor(`document.querySelectorAll('[role=group][aria-label="Grupo Jogos"] button[title^="Trabalho "]').length===0 && !!document.querySelector('nav button[title^="Trabalho "]')`));
  // ---- drag and drop onto the folder ----
  await ev(`(()=>{const dt=new DataTransfer();const src=document.querySelector('nav button[title^="Amigos "]');const dst=document.querySelector('[role=group][aria-label="Grupo Jogos"] button[aria-expanded]');src.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt}));dst.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt}));dst.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));})()`);
  ok("arrastar um servidor para o grupo move para dentro", await waitFor(`document.querySelectorAll('[role=group][aria-label="Grupo Jogos"] button[title^="Amigos "]').length===1`));
  // ---- edit: rename + recolour; delete keeps the servers ----
  await ev(`document.querySelector('button[aria-label="Opções do grupo Jogos"]').click()`);
  await ev(`[...document.querySelectorAll('[role=menuitem]')].find(b=>/Editar grupo/.test(b.innerText)).click()`);
  ok("editar abre a janela com o nome atual", await waitFor(`document.querySelector('input[aria-label="Nome do grupo"]')?.value === 'Jogos'`));
  await setVal('input[aria-label="Nome do grupo"]', "Games");
  await ev(`[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Salvar').click()`);
  ok("renomear funciona e fica salvo", await waitFor(`!!document.querySelector('[role=group][aria-label="Grupo Games"]')`) && await (async () => { for (let i = 0; i < 20; i++) { if ((await prefsGroups())[0]?.name === "Games") return true; await sleep(300); } return false; })());
  await shot(`groups-2-editado-${TAG}`);
  await ev(`document.querySelector('button[aria-label="Opções do grupo Games"]').click()`);
  await ev(`[...document.querySelectorAll('[role=menuitem]')].find(b=>/Desfazer grupo/.test(b.innerText)).click()`);
  { const gone = await waitFor(`!document.querySelector('nav [role=group]')`), loose = await ev(`[...document.querySelectorAll('nav button[title]')].filter(b=>/ ${run}$/.test(b.title)).length`);
    let left = (await prefsGroups()).length; for (let i = 0; i < 20 && left; i++) { await sleep(300); left = (await prefsGroups()).length; }
    ok("desfazer o grupo mantém todos os servidores soltos", gone && loose === 5 && left === 0, `sem grupo=${gone} soltos=${loose} grupos salvos=${left}`); }
  // ---- validation on the server ----
  const bad = await http("/me/prefs", { serverGroups: [{ id: "x", name: "   ", color: "red", serverIds: [], open: true }] }, U.token, "PUT");
  ok("o servidor recusa grupo sem nome ou com cor inválida", bad.s === 400);
  const many = await http("/me/prefs", { serverGroups: Array.from({ length: 31 }, (_, i) => ({ id: "g" + i, name: "G" + i, color: "#ff3b5c", serverIds: [], open: true })) }, U.token, "PUT");
  ok("o servidor limita a 30 grupos", many.s === 400);
  if (!ATTACH) { await cmd("Emulation.setDeviceMetricsOverride", { width: 390, height: 800, deviceScaleFactor: 2, mobile: true }); await sleep(800); ok("celular: sem rolagem lateral", await ev(`document.documentElement.scrollWidth <= window.innerWidth + 1`)); }
  ok("sem erros de JavaScript", errors.length === 0, errors.slice(0, 2).join(" | ").slice(0, 240));
} finally { ws.close(); chrome?.kill(); }
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
