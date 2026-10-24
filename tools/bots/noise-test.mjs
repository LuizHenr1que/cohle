// Objective noise-suppression test. The desktop app (built client) uses a WAV file as its microphone; a second participant records
// the audio that actually arrives through LiveKit. Reports speech level, noise floor and SNR per mode.
//   env: MODE_LIST="off,browser,rnnoise,gtcrn"  MIC=noisy|clean
import { Room, RoomEvent, AudioStream, TrackKind } from "@livekit/rtc-node";
import { execSync, spawn } from "node:child_process";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", PORT = process.env.PORT ?? 9341;
const targets = async () => (await (await fetch(`http://localhost:${PORT}/json`)).json()).filter((t) => t.type === "page" && !t.url.includes("overlay.html"));
async function conn(t) { const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
  return { ev: (x) => new Promise((r) => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: x, returnByValue: true, awaitPromise: true } })); }).then((r) => r.result?.value) }; }
const http = async (p, m = "GET", b, t) => { const r = await fetch(API + p, { method: m, headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(t ? { Authorization: "Bearer " + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const db = (x) => 20 * Math.log10(Math.max(x, 1e-9));

const l1 = await http("/auth/login", "POST", { email: "teste1@cohle.dev", password: "teste12345" });
const l2 = await http("/auth/login", "POST", { email: "teste2@cohle.dev", password: "teste12345" });
const srv = (await http("/servers", "GET", undefined, l2.d.token)).d.find((s) => s.name === "Servidor de Teste");
const voice = srv.channels.find((c) => c.type === "VOICE");
const main = await conn((await targets())[0]);
const click = (t) => main.ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>(b.textContent||'').includes(${JSON.stringify(t)})||(b.title||'').includes(${JSON.stringify(t)}));if(b){b.click();return true}return false})()`);

async function measure(mode) {
  await main.ev(`localStorage.clear(); localStorage.setItem('cohle:noise','${mode}'); localStorage.setItem('cohle:debug','1'); localStorage.setItem('token',${JSON.stringify(l1.d.token)}); localStorage.setItem('me',${JSON.stringify(JSON.stringify(l1.d.user))}); location.reload()`); await sleep(4500);
  if (!(await click("Sala de voz"))) { await click("Abrir menu"); await sleep(600); await click("Sala de voz"); }
  await sleep(9000);
  if (!/Conectado/.test(await main.ev("document.body.innerText"))) return { mode, error: "não conectou" };
  const err = (await main.ev("document.body.innerText")).match(/Não consegui ligar a supressão[^\n]*/)?.[0];
  const { token, url } = (await http(`/channels/${voice.id}/voice-token`, "POST", undefined, l2.d.token)).d;
  const room = new Room(); const win = []; let acc = [], n = 0;
  room.on(RoomEvent.TrackSubscribed, (t) => { if (t.kind !== TrackKind.KIND_AUDIO) return; (async () => { for await (const f of new AudioStream(t, 48000, 1)) { for (let i = 0; i < f.data.length; i++) { acc.push(f.data[i] / 32768); } while (acc.length >= 2400) { const seg = acc.splice(0, 2400); let s = 0; for (const v of seg) s += v * v; win.push(Math.sqrt(s / seg.length)); } } })().catch(() => {}); });
  await room.connect(url, token, { autoSubscribe: true });
  // CPU of every Electron process while this mode runs (macOS `top`, 3 samples 3 s apart, run alongside the recording)
  const pids = execSync(`pgrep -f "Electron.app/Contents" || true`).toString().trim().split("\n").filter(Boolean);
  const topProc = spawn("sh", ["-c", `sleep 6; top -l 3 -s 3 ${pids.map((p) => `-pid ${p}`).join(" ")} -stats pid,cpu 2>/dev/null`]); let topOut = ""; topProc.stdout.on("data", (d) => (topOut += d));
  await sleep(26000); await room.disconnect();
  const lastTop = topOut.split(/^PID/m).pop() ?? ""; const cpuTotal = lastTop.split("\n").map((l) => l.trim().split(/\s+/)).filter((x) => /^\d+$/.test(x[0])).reduce((s, x) => s + parseFloat(x[1].replace(",", ".")), 0);
  await click("Sair da chamada"); await sleep(1500);
  const sorted = [...win].sort((a, b) => a - b), q = (p) => sorted[Math.floor(sorted.length * p)];
  const floor = Math.sqrt(sorted.slice(0, Math.floor(sorted.length * 0.2)).reduce((s, v) => s + v * v, 0) / Math.floor(sorted.length * 0.2));
  const top = sorted.slice(Math.floor(sorted.length * 0.85)), speech = Math.sqrt(top.reduce((s, v) => s + v * v, 0) / top.length);
  const cpu = (() => { try { const pids = execSync(`pgrep -f "Electron.app/Contents" || true`).toString().trim().split("\n").filter(Boolean); return null; } catch { return null; } })();
  return { mode, cpu: cpuTotal, windows: win.length, speechDb: db(speech), floorDb: db(floor), snr: db(speech) - db(floor), err };
}
const modes = (process.env.MODE_LIST ?? "off,browser,rnnoise,gtcrn").split(",");
const res = []; for (const m of modes) { const r = await measure(m); res.push(r); console.log(r.error ? `${m}: ${r.error}` : `${m.padEnd(8)} fala ${r.speechDb.toFixed(1).padStart(6)} dB | ruído de fundo ${r.floorDb.toFixed(1).padStart(6)} dB | relação voz/ruído ${r.snr.toFixed(1).padStart(5)} dB | CPU do app ${r.cpu.toFixed(0)}%${r.err ? " | AVISO: " + r.err : ""}`); }
const base = res.find((r) => r.mode === "off");
if (base) { console.log("\nvs. sem tratamento:"); for (const r of res) if (r.mode !== "off" && !r.error) console.log(`  ${r.mode.padEnd(8)} ruído ${(r.floorDb - base.floorDb).toFixed(1).padStart(6)} dB | fala ${(r.speechDb - base.speechDb).toFixed(1).padStart(5)} dB | relação voz/ruído ${(r.snr - base.snr >= 0 ? "+" : "") + (r.snr - base.snr).toFixed(1)} dB`); }
process.exit(0);
