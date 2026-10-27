// Expandable left rail: names and labels, remembered between sessions. Electron test app on CDP 9341 (window wide enough).
import { writeFileSync } from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001";
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const a = await (await fetch(API + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "teste1@cohle.dev", password: "teste12345" }) })).json();
const t = (await (await fetch("http://localhost:9341/json")).json()).find((t) => t.type === "page" && !t.url.includes("overlay.html"));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const cmd = (method, params) => new Promise((r) => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const nav = () => ev(`document.querySelector('nav').innerText.replace(/\\n+/g,' | ')`);
const boot = async () => { await ev(`localStorage.setItem('token',${JSON.stringify(a.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(a.user))});location.reload()`); await sleep(4500); };
await ev(`localStorage.removeItem('cohle:rail')`); await boot();
const w0 = await ev(`document.querySelector('nav').getBoundingClientRect().width`);
ok("começa recolhida (só ícones, 72 px)", Math.round(w0) === 72 && !/Criar servidor/.test(await nav()), `${w0}px`);
await ev(`document.querySelector('button[title^="Expandir a barra lateral"]').click()`); await sleep(400);
const txt = await nav(), w1 = await ev(`document.querySelector('nav').getBoundingClientRect().width`);
ok("expandir mostra nomes dos servidores e rótulos dos botões", ["Servidor de Teste", "Mensagens diretas", "Criar servidor", "Entrar com convite", "Modo leve", "Animação de fundo", "Sair da conta"].every((x) => txt.includes(x)), `${Math.round(w1)}px · ${txt.slice(0, 150)}`);
await cmd("Page.bringToFront"); await cmd("Emulation.setFocusEmulationEnabled", { enabled: true });          // a hidden window never paints: without this the capture waits forever
const shot = await Promise.race([cmd("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 520, height: 700, scale: 1 } }), sleep(8000).then(() => null)]); if (shot) writeFileSync("/tmp/rail.png", Buffer.from(shot.data, "base64"));
await boot();
ok("a escolha é lembrada ao reabrir", /Criar servidor/.test(await nav()));
await ev(`[...document.querySelectorAll('nav button')].find(b=>b.innerText.includes('Servidor de Teste'))?.click()`); await sleep(500);
ok("clicar no nome do servidor seleciona o servidor", await ev(`document.body.innerText.includes('Sala de voz')`));
await ev(`document.querySelector('button[title="Recolher a barra lateral"]').click()`); await sleep(300);
ok("recolher volta aos ícones", Math.round(await ev(`document.querySelector('nav').getBoundingClientRect().width`)) === 72);
await ev(`localStorage.removeItem('cohle:rail')`);
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
