// The sidebar of a member who is NOT in the call must show who is in each voice room (real client, dev stack).
import { Room } from "@livekit/rtc-node";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001", PORT = process.env.PORT ?? 9341;
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); return c; };
const http = async (p, m = "GET", b, t) => { const r = await fetch(API + p, { method: m, headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(t ? { Authorization: "Bearer " + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const a = (await http("/auth/login", "POST", { email: "teste1@cohle.dev", password: "teste12345" })).d, b = (await http("/auth/login", "POST", { email: "teste2@cohle.dev", password: "teste12345" })).d;
const voiceCh = (await http("/servers", "GET", undefined, a.token)).d.find((s) => s.name === "Servidor de Teste").channels.find((c) => c.type === "VOICE");
const t = (await (await fetch(`http://localhost:${PORT}/json`)).json()).find((t) => t.type === "page" && !t.url.includes("overlay.html"));
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const ev = (x) => new Promise((r) => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: x, returnByValue: true, awaitPromise: true } })); }).then((r) => r.result?.value);
await ev(`localStorage.clear(); localStorage.setItem('token',${JSON.stringify(a.token)}); localStorage.setItem('me',${JSON.stringify(JSON.stringify(a.user))}); location.reload()`); await sleep(5000);
await ev(`(()=>{if(!/Sala de voz/.test(document.body.innerText)){[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||'').includes('Abrir menu'))?.click()}})()`); await sleep(800);
const sidebar = () => ev(`(document.querySelector('aside')?.innerText) ?? ''`);       // ONLY the channel list (the chat also contains the name)
ok("o teste1 NÃO está em chamada, vendo a lista de canais, e ninguém na sala", /Sala de voz/.test(await sidebar()) && !/Em voz:/.test(await sidebar()) && !/teste2/.test(await sidebar()), (await sidebar()).replace(/\n+/g, " | ").slice(0, 120));
const { token, url } = (await http(`/channels/${voiceCh.id}/voice-token`, "POST", undefined, b.token)).d;
const room = new Room(); await room.connect(url, token, { autoSubscribe: false }); const t0 = Date.now();      // joins LiveKit only: no socket message at all
let seen = false; for (let i = 0; i < 24 && !seen; i++) { await sleep(500); seen = /teste2/.test(await sidebar()); }
ok("a lista lateral mostra o teste2 mesmo sem ele ter avisado", seen, `em ${((Date.now() - t0) / 1000).toFixed(1)} s`);
await room.disconnect(); const t1 = Date.now(); let gone = false; for (let i = 0; i < 50 && !gone; i++) { await sleep(500); gone = !/teste2/.test(await sidebar()); }
ok("quando ele sai, some da lista", gone, `em ${((Date.now() - t1) / 1000).toFixed(1)} s`);
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
