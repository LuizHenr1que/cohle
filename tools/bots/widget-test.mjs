// Floating widget: names of people who stopped (or left) must vanish, and the widget can be dragged. Needs bots.mjs --count 3 and the Electron test app (CDP 9341).
import { execSync } from "node:child_process";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", PORT = 9341;
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const a = await (await fetch(API + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "teste1@cohle.dev", password: "teste12345" }) })).json();
const targets = async () => (await (await fetch(`http://localhost:${PORT}/json`)).json());
const open = async (t) => { const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
  const cmd = (method, params) => new Promise((r) => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  return { cmd, ev: (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value) }; };
const app = await open((await targets()).find((t) => t.type === "page" && !t.url.includes("overlay.html")));
await app.ev(`localStorage.clear(); localStorage.setItem('token',${JSON.stringify(a.token)}); localStorage.setItem('me',${JSON.stringify(JSON.stringify(a.user))}); location.reload()`); await sleep(5000);
await app.ev(`[...document.querySelectorAll('aside button')].find(b=>b.innerText.includes('Sala de voz'))?.click()`); await sleep(7000);
execSync(`osascript -e 'tell application "Finder" to activate'`); await sleep(2500);       // app goes to the background: the widget shows
const ovT = (await targets()).find((t) => t.url.includes("overlay.html")); ok("widget aparece com o app em segundo plano", !!ovT);
const ov = await open(ovT);
const names = () => ov.ev(`[...document.querySelectorAll('.who .nm')].map(x=>x.textContent)`);
let seen = []; for (let i = 0; i < 20 && !seen.length; i++) { await sleep(500); seen = await names(); }
ok("mostra quem está falando", seen.length > 0, JSON.stringify(seen));

// drag: real mouse events on the widget header
const pos = () => ov.ev(`({x:window.screenX,y:window.screenY})`);
const before = await pos();
const hdr = await ov.ev(`(()=>{const b=document.getElementById('ch').getBoundingClientRect();return {x:b.x+10,y:b.y+8}})()`);
const m = (type, x, y) => ov.cmd("Input.dispatchMouseEvent", { type, x, y, button: type === "mouseMoved" ? "none" : "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });
await ov.ev(`window.__ev=[];addEventListener('mousemove',e=>__ev.push([e.screenX,e.screenY,e.clientX,e.clientY,window.screenX]))`);
await ov.ev(`window.overlayApi.interactive(true)`); await m("mouseMoved", hdr.x, hdr.y); await m("mousePressed", hdr.x, hdr.y);
// a real mouse has absolute screen coordinates; CDP's are relative to the window, which moves with the drag, so compensate
const at = async (dx, dy) => { const c = await pos(); return { x: hdr.x + dx - (c.x - before.x), y: hdr.y + dy - (c.y - before.y) }; };
for (let i = 1; i <= 8; i++) { const q = await at(-i * 40, i * 30); await m("mouseMoved", q.x, q.y); await sleep(60); }
console.log('  passos:', JSON.stringify(await ov.ev(`window.__ev`)), JSON.stringify(await pos()));
const q = await at(-320, 240); await m("mouseReleased", q.x, q.y); await sleep(400);
const after = await pos(); ok("arrastar move o widget pela tela", Math.abs(after.x - before.x) > 100 && Math.abs(after.y - before.y) > 100, `${JSON.stringify(before)} -> ${JSON.stringify(after)}`);

// the bots leave: nobody is "talking" any more
execSync(`pkill -f bots.mjs`); let gone = false; for (let i = 0; i < 24 && !gone; i++) { await sleep(500); gone = (await names()).length === 0; }
ok("quem saiu da sala some do widget", gone, JSON.stringify(await names()));
// leave the call and come back: no leftovers
await app.ev(`document.querySelector('button[title="Sair da chamada"]')?.click()`); await sleep(1500);
await app.ev(`[...document.querySelectorAll('aside button')].find(b=>b.innerText.includes('Sala de voz'))?.click()`); await sleep(6000);
execSync(`osascript -e 'tell application "Finder" to activate'`); await sleep(2000);
ok("depois de sair e voltar, nenhum nome preso", (await names()).filter((n) => n !== "teste1").length === 0, JSON.stringify(await names()) + " (teste1 sou eu, o microfone real do Mac)");
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
