// Voice in the WEB client: headless Chrome with a fake microphone/camera joins the local LiveKit. Dev API + vite + `docker compose up -d livekit` (infra/).
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { io } from "../bots/node_modules/socket.io-client/build/esm/index.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", OUT = process.env.SHOTS ?? tmpdir();
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok) => { const r = await fetch(API + p, { method: b ? "POST" : "GET", headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const login = async (e) => (await http("/auth/login", { email: e, password: "teste12345" })).d;
const a = await login("teste1@cohle.dev"), b = await login("teste2@cohle.dev");
// an observer (teste2) sees what teste1 does in the browser, exactly as another person would
const states = new Map(); const sk = io(API, { auth: { token: b.token }, transports: ["websocket"] });
const take = (s) => { for (const v of Array.isArray(s) ? s : [s]) states.set(v.channelId, v.users); };
sk.on("voice:snapshot", take); sk.on("voice:state", take);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--remote-debugging-port=9352", `--user-data-dir=${mkdtempSync(tmpdir() + "/cohle-voice-")}`, "--window-size=1280,860", "--no-first-run", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--auto-select-desktop-capture-source=Entire screen", "--autoplay-policy=no-user-gesture-required", "about:blank"], { stdio: "ignore" });
let t; for (let i = 0; i < 40 && !t; i++) { await sleep(300); try { t = (await (await fetch("http://localhost:9352/json")).json()).find((x) => x.type === "page"); } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) w.get(m.id)?.(m.result); };
const cmd = (method, params) => new Promise((rr) => { const i = ++id; w.set(i, rr); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (x) => cmd("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }).then((r) => r.result?.value);
const text = () => ev(`document.body.innerText`);
const click = (txt, scope = "button") => ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(scope)})].find(b=>b.innerText.includes(${JSON.stringify(txt)}));if(e)e.click();return !!e})()`);
const shot = async (f) => { await sleep(800); writeFileSync(`${OUT}/${f}.png`, Buffer.from((await cmd("Page.captureScreenshot", { format: "png" })).data, "base64")); };
const me = async () => (states.get([...states.keys()].find((k) => states.get(k)?.some((u) => u.id === a.user.id))) ?? []).find((u) => u.id === a.user.id);
try {
  await cmd("Runtime.enable"); await cmd("Page.enable");
  await cmd("Page.navigate", { url: "http://localhost:5173/" }); await sleep(1500);
  await ev(`sessionStorage.clear();localStorage.clear();localStorage.setItem('token',${JSON.stringify(a.token)});localStorage.setItem('me',${JSON.stringify(JSON.stringify(a.user))});localStorage.setItem('cohle:tour:${a.user.id}','done');location.reload()`); await sleep(4000);
  await click("Servidor de Teste", "button"); await sleep(1000);
  await click("Sala de voz", "button, a, div[role=button]"); await sleep(6000);
  const inCall = await me();
  ok("o navegador entra na sala de voz e os outros veem a pessoa", !!inCall, inCall ? inCall.username : JSON.stringify([...states]).slice(0, 120));
  ok("microfone abre (microfone falso do Chrome) sem erro na tela", !/microfone|Microphone/i.test((await text()).split("\n").filter((l) => /não foi possível|negad|erro/i.test(l)).join(" ")));
  await shot("web-voice-1-sala");
  // mute from the web UI, the other side must see it
  await ev(`document.querySelector('button[title*="icrofone"],button[title*="Silenciar"],button[title*="Mutar"]')?.click()`); await sleep(1800);
  const afterMute = await me();
  ok("silenciar o microfone no navegador chega aos outros", afterMute && afterMute.micOff === true, JSON.stringify(afterMute && { micOff: afterMute.micOff }));
  // screen share through the browser's own picker
  await ev(`document.querySelector('button[title="Compartilhar tela"]')?.click()`); await sleep(5000);
  const sharing = await me();
  ok("compartilhar tela no navegador chega aos outros", !!sharing?.sharing, `sharing=${sharing?.sharing}`);
  await shot("web-voice-2-tela");
  // leave
  const clicked = await ev(`(()=>{const b=document.querySelector('button[title="Sair da chamada"]');b?.click();return !!b})()`);
  let gone = false; for (let i = 0; i < 12 && !gone; i++) { await sleep(1000); gone = !(await me()); }
  ok("sair da sala pelo navegador tira a pessoa da lista", clicked && gone, `botão=${clicked} saiu=${gone}`);
} finally { sk.close(); ws.close(); chrome.kill(); }
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
