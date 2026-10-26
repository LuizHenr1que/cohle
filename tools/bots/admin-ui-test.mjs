// Admin panel in a real browser (headless Chrome on CDP 9350). Needs: dev API with OWNER_EMAILS=teste1@cohle.dev + vite on :5173.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", OUT = process.env.SHOTS ?? tmpdir();
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const login = async (e) => (await http("/auth/login", { email: e, password: "teste12345" })).d;
const a = await login("teste1@cohle.dev"), b = await login("teste2@cohle.dev");
await http(`/admin/users/${b.user.id}/role`, { role: "USER" }, a.token);

const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--remote-debugging-port=9350", `--user-data-dir=${mkdtempSync(tmpdir() + "/cohle-chrome-")}`, "--window-size=1280,860", "--no-first-run", "about:blank"], { stdio: "ignore" });
let t; for (let i = 0; i < 40 && !t; i++) { await sleep(300); try { t = (await (await fetch("http://localhost:9350/json")).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const cmd = (method, params) => new Promise((rr) => { const i = ++id; w.set(i, rr); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const text = () => ev(`document.body.innerText`);
const click = (txt, scope = "button") => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(scope)})].find(b=>b.innerText.includes(${JSON.stringify(txt)}));if(e)e.click();return !!e})()`);
const shot = async (f) => { await sleep(700); writeFileSync(`${OUT}/${f}.png`, Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).data, "base64")); };
const open = async (who) => {
  await cmd("Page.navigate", { url: "http://localhost:5173/" }); await sleep(1500);
  await ev(`sessionStorage.clear();localStorage.clear();localStorage.setItem('token',${JSON.stringify(who.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(who.user))});localStorage.setItem('cohle:tour:${who.user.id}','done');location.reload()`); await sleep(3500);
};
try {
  await cmd("Runtime.enable"); await cmd("Page.enable");
  // a regular person never sees the entry
  await open(b);
  await click("", 'button[title="Configurações e perfil"]'); await sleep(600);
  ok("pessoa comum: configurações NÃO mostram o Painel do Cohle", !/Painel do Cohle/.test(await text()));
  // the master does
  await open(a);
  await ev(`document.querySelector('button[title="Configurações e perfil"]').click()`); await sleep(700);
  ok("dono: configurações mostram o Painel do Cohle", /Painel do Cohle/.test(await text()));
  await click("Painel do Cohle"); await sleep(2500);
  let tx = await text();
  ok("painel abre com selo Dono e as 4 abas", /Painel do Cohle/.test(tx) && /Dono/i.test(tx) && ["Visão geral", "Plano grátis", "Pessoas", "Acessos"].every((s) => tx.includes(s)));
  ok("visão geral mostra contas, online e memória", /Contas/.test(tx) && /Online agora/.test(tx) && /Memória do servidor/.test(tx) && /Banco de dados/.test(tx));
  await shot("admin-1-visao-geral");
  await click("Plano grátis"); await sleep(1800); tx = await text();
  ok("plano grátis lista Render, Supabase e LiveKit", /Render: horas/.test(tx) && /Render: memória/.test(tx) && /Supabase: tamanho do banco/.test(tx) && /LiveKit: minutos/.test(tx));
  ok("plano grátis traz o veredito do mês", /plano grátis|limite grátis|ficar de olho/.test(tx));
  await shot("admin-2-plano-gratis");
  await click("Pessoas"); await sleep(1800); tx = await text();
  ok("pessoas mostra e-mails e o dono", /teste2@cohle\.dev/.test(tx) && /teste1@cohle\.dev/.test(tx) && /Dono/i.test(tx));
  await click("Tornar admin"); await sleep(1500);
  ok("dono promove teste2 a Admin pela tela", (await http("/admin/overview", null, (await login("teste2@cohle.dev")).token)).s === 200);
  await shot("admin-3-pessoas");
  await http(`/admin/users/${b.user.id}/role`, { role: "USER" }, a.token);
  await click("Acessos"); await sleep(1500); tx = await text();
  ok("acessos mostra quem entrou", /Entrou/.test(tx) && /teste1@cohle\.dev/.test(tx));
  await shot("admin-4-acessos");
  // phone width: no sideways scrolling
  await cmd("Emulation.setDeviceMetricsOverride", { width: 390, height: 800, deviceScaleFactor: 2, mobile: true });
  await click("Visão geral"); await sleep(1200);
  ok("no celular a página não rola para o lado", await ev(`document.documentElement.scrollWidth <= window.innerWidth + 1`), String(await ev(`document.documentElement.scrollWidth + ' vs ' + window.innerWidth`)));
  await shot("admin-5-celular");
} finally { ws.close(); chrome.kill(); }
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
