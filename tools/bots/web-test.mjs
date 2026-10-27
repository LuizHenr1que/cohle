// The client as a WEB app in a real browser (headless Chrome, CDP 9351): no Electron. Needs dev API (:3001, seed users) + vite (:5173).
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = process.env.SHOTS ?? tmpdir(), URL_ = process.env.WEB ?? "http://localhost:5173/";
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--remote-debugging-port=9351", `--user-data-dir=${mkdtempSync(tmpdir() + "/cohle-web-")}`, "--window-size=1280,860", "--no-first-run", "about:blank"], { stdio: "ignore" });
let t; for (let i = 0; i < 40 && !t; i++) { await sleep(300); try { t = (await (await fetch("http://localhost:9351/json")).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); const errors = [];
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) w.get(m.id)?.(m.result);
  else if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map((a) => a.value ?? a.description).join(" ")); };
const cmd = (method, params) => new Promise((rr) => { const i = ++id; w.set(i, rr); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const text = () => ev(`document.body.innerText`);
const click = (txt, scope = "button") => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(scope)})].find(b=>b.innerText.includes(${JSON.stringify(txt)}));if(e)e.click();return !!e})()`);
const setVal = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(v)});e.dispatchEvent(new Event('input',{bubbles:true}));return !!e})()`);
const shot = async (f) => { await sleep(700); writeFileSync(`${OUT}/${f}.png`, Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).data, "base64")); };
const noSideScroll = () => ev(`document.documentElement.scrollWidth <= window.innerWidth + 1`);
try {
  await cmd("Runtime.enable"); await cmd("Page.enable");
  await cmd("Page.navigate", { url: URL_ }); await sleep(2500);
  await ev(`localStorage.clear();sessionStorage.clear();location.reload()`); await sleep(2500);
  ok("não existe window.cohle (é web de verdade)", (await ev(`typeof window.cohle`)) === "undefined");
  ok("tela de entrada abre", /Entrar|Criar conta/.test(await text()));
  ok("manifesto do app instalável está ligado", (await ev(`document.querySelector('link[rel=manifest]')?.href`))?.endsWith("/manifest.webmanifest"));
  ok("página do app pede para não ser indexada", (await ev(`document.querySelector('meta[name=robots]')?.content`)) === "noindex");
  ok("login: a logo é o atalho discreto para o site, sem cartão", (await ev(`!!document.querySelector('button[title="Ir para o site do Cohle"]')`)) && !/Prefere o aplicativo/.test(await text()));
  await ev(`window.__opened=[];window.open=(u)=>{window.__opened.push(u)}`); await ev(`document.querySelector('button[title="Ir para o site do Cohle"]').click()`); await sleep(200);
  ok("clicar na logo abre o site do Cohle", (await ev(`window.__opened[0]`)) === "https://cohle.verticeapp.com.br");
  await shot("web-1-login");
  // real login through the form
  await setVal('input[placeholder="E-mail ou @usuário"]', "teste1@cohle.dev"); await setVal('input[placeholder^="Senha"]', "teste12345");
  await click("Entrar", "button.grad"); await sleep(4000);
  let tx = await text();
  ok("login pelo formulário leva ao app", /Servidor de Teste/.test(tx) || /geral/.test(tx), tx.slice(0, 80).replace(/\n/g, " | "));
  ok("depois do login, mesmo com servidor, fica na tela de boas-vindas", /Bem-vindo ao Cohle/.test(tx) && /Seus servidores/i.test(tx) && /Servidor de Teste/.test(tx) && !(await ev(`!!document.querySelector('textarea[aria-label="Mensagem"]')`)));
  await shot("web-2-app");
  await click("Servidor de Teste", "section[aria-label=\"Seus servidores\"] button"); await sleep(1200);
  ok("clicar no servidor abre o servidor (canais) e sai da boas-vindas", /TEXTO/i.test(await text()) && !/Seus servidores/i.test(await text()));
  await ev(`document.querySelector('button[aria-label="Ir para o início"]').click()`); await sleep(700);
  ok("o logo do Cohle volta para a tela de boas-vindas", /Bem-vindo ao Cohle/.test(await text()) && /Seus servidores/i.test(await text()));
  // text chat in the browser
  await ev(`(document.querySelector('button[title="Servidor de Teste"]')||[...document.querySelectorAll('button')].find(b=>b.innerText.includes('Servidor de Teste')))?.click()`); await sleep(1200);
  await click("geral", "button, a, div[role=button]"); await sleep(1500);
  const msg = "mensagem web " + Date.now();
  const typed = await ev(`(()=>{const i=document.querySelector('input[placeholder^="Mensagem em"],textarea[placeholder^="Mensagem em"]');if(!i)return false;const d=Object.getOwnPropertyDescriptor(i.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value');d.set.call(i,${JSON.stringify(msg)});i.dispatchEvent(new Event('input',{bubbles:true}));i.focus();return true})()`);
  await sleep(300); await ev(`document.querySelector('form button.grad').click()`); await sleep(1800);
  ok("manda e recebe mensagem de texto no navegador", typed && await (async () => { for (let i = 0; i < 24; i++) { if ((await text()).includes(msg)) return true; await sleep(400); } return false; })());
  // settings: web has no "Aplicativo" tab, and offers the desktop download
  await ev(`document.querySelector('button[title="Configurações e perfil"]').click()`); await sleep(700);
  tx = await text();
  ok("configurações sem a aba do aplicativo desktop", !/Aplicativo\n/.test(tx) && !/Fechar para a bandeja/.test(tx));
  await click("Sobre"); await sleep(500); tx = await text();
  ok("Sobre diz que é o Cohle no navegador e oferece o app", /Cohle no navegador/.test(tx) && /Aplicativo para computador/.test(tx));
  await ev(`window.__opened=[];window.open=(u)=>{window.__opened.push(u)}`);
  await click("Baixar", "button"); await sleep(300);
  ok("o atalho Baixar leva à seção certa da landing", (await ev(`window.__opened[0]`)) === "https://cohle.verticeapp.com.br/#baixar");
  await shot("web-3-sobre");
  // themes: pick one, it applies at once, it survives a reload, and the default comes back
  await click("Aparência"); await sleep(400);
  const accent = () => ev(`getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim()`);
  const before = await accent();
  await ev(`[...document.querySelectorAll('[role=dialog] button')].find(b=>b.innerText.startsWith('Oceano')).click()`); await sleep(400);
  ok("escolher o tema Oceano troca as cores na hora", (await ev(`document.documentElement.dataset.theme`)) === "ocean" && (await accent()) === "#3b8cff" && before === "#ff3b5c", `${before} -> ${await accent()}`);
  await ev(`[...document.querySelectorAll('[role=dialog] button')].find(b=>b.innerText.startsWith('Cohle')).click()`); await sleep(400);
  ok("e dá para voltar ao tema Cohle", (await accent()) === "#ff3b5c");
  await cmd("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 }); await sleep(400);
  // phone-size browser
  await cmd("Emulation.setDeviceMetricsOverride", { width: 390, height: 800, deviceScaleFactor: 2, mobile: true }); await sleep(900);
  ok("celular: o app não rola para o lado", await noSideScroll(), String(await ev(`document.documentElement.scrollWidth`)));
  await shot("web-4-celular");
  await ev(`localStorage.clear();sessionStorage.clear();location.reload()`); await sleep(2500);
  ok("celular: a tela de entrada não rola para o lado", await noSideScroll());
  await shot("web-5-login-celular");
  const bad = errors.filter((e) => !/favicon|WebSocket|Failed to load resource|net::ERR/.test(e));
  ok("sem erros no console do navegador", bad.length === 0, bad.slice(0, 2).join(" || ").slice(0, 300));
} finally { ws.close(); chrome.kill(); }
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
