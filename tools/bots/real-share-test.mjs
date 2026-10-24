// REAL end-to-end test of desktop screen sharing with the INSTALLED Cohle app:
//  1) drives the installed app (CDP) : login as teste1, join a voice room, pick the whole screen, share it
//  2) a second participant (teste2) receives the video through LiveKit Cloud
//  3) compares what was received with a real screenshot of this Mac's desktop taken at the same moment
// env: T1_PW, T2_PW, LK_HTTP, LK_KEY, LK_SECRET
import { Room, RoomEvent, VideoStream, TrackKind, TrackSource, VideoBufferType } from "@livekit/rtc-node";
import { execSync, spawn } from "node:child_process";
import { RoomServiceClient } from "livekit-server-sdk";
import { readFileSync, writeFileSync } from "node:fs";

const API = "https://cohle-api.onrender.com", PORT = 9338, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); return c; };
const http = async (p, m = "GET", b, t) => { const r = await fetch(API + p, { method: m, headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(t ? { Authorization: "Bearer " + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };

// ---- tiny CDP client for the installed app ----
const pages = await (await fetch(`http://localhost:${PORT}/json`)).json();
const ws = new WebSocket(pages.find((p) => p.type === "page" && !p.url.includes("overlay.html")).webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const w = new Map(); ws.onmessage = (e) => { const m = JSON.parse(e.data); w.get(m.id)?.(m.result); };
const ev = (x) => new Promise((r) => { const i = ++id; w.set(i, r); ws.send(JSON.stringify({ id: i, method: "Runtime.evaluate", params: { expression: x, returnByValue: true, awaitPromise: true } })); }).then((r) => r.result?.value);
const click = (t) => ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>(b.textContent||'').includes(${JSON.stringify(t)})||(b.title||'').includes(${JSON.stringify(t)}));if(b){b.click();return true}return false})()`);

// a moving, colourful window on the desktop: gives the screen share motion and recognisable content
const motion = spawn("../../apps/desktop/node_modules/.bin/electron", ["ui-check/motion.cjs"], { stdio: "ignore" });
await sleep(3000);

// ---- 1) the installed app shares the screen ----
const login = await http("/auth/login", "POST", { email: "teste1@cohle.dev", password: process.env.T1_PW });
ok("login do teste1 no servidor de produção", login.s === 200);
await ev(`localStorage.clear(); localStorage.setItem('cohle:debug','1'); localStorage.setItem('token',${JSON.stringify(login.d.token)}); localStorage.setItem('me',${JSON.stringify(JSON.stringify(login.d.user))}); location.reload()`);
await sleep(4500);
ok("entra na sala de voz", await click("Sala de filmes")); await sleep(9000);
ok("conectado", /Conectado/.test(await ev("document.body.innerText")));
await click("Compartilhar tela"); await sleep(1500);
const picker = await ev(`document.body.innerText`);
ok("o seletor de tela abre e lista telas/janelas", /Compartilhar tela/.test(picker) && /Tela inteira/.test(picker) && !/Nada disponível/.test(picker.split("Qualidade")[0]));
const nShown = await ev(`document.querySelectorAll('img[alt]').length`);
ok("há miniaturas reais para escolher", nShown >= 1, `${nShown} miniatura(s)`);
const Q = process.env.Q ?? "Equilibrada"; await click(Q); await sleep(300); console.log("   qualidade escolhida:", Q);
const shotPath = "/tmp/desktop-real.bmp";
// confirm with the modal's own button (exact label), not the call-bar button whose title also contains the word
console.log("   botão de confirmar:", await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>(b.textContent||'').trim()==='Compartilhar');if(!b)return 'NÃO ACHEI';const d=b.disabled;b.click();return d?'desabilitado':'clicado'})()`));
execSync(`screencapture -x -t bmp ${shotPath}`);   // the real desktop, at the moment of sharing
await sleep(7000);
ok('o app mostra "AO VIVO" e a prévia', /AO VIVO/.test(await ev("document.body.innerText")));

// ---- 2) a second participant receives it ----
const l2 = await http("/auth/login", "POST", { email: "teste2@cohle.dev", password: process.env.T2_PW });
const srv = (await http("/servers", "GET", undefined, l2.d.token)).d.find((s) => s.name === "Servidor de Teste");
const room_ = srv.channels.find((c) => c.name === "Sala de filmes");
const { token, url } = (await http(`/channels/${room_.id}/voice-token`, "POST", undefined, l2.d.token)).d;
const room = new Room(); let st = null, last = null;
const GRID = [64, 36];
room.on(RoomEvent.TrackSubscribed, (t, pub, p) => {
  if (t.kind !== TrackKind.KIND_VIDEO || pub.source !== TrackSource.SOURCE_SCREENSHARE) return;
  st = { from: p.name, frames: 0, w: 0, h: 0, t0: Date.now() };
  (async () => { for await (const e of new VideoStream(t)) { const f = e.frame.convert(VideoBufferType.RGBA); st.w = f.width; st.h = f.height; st.frames++; last = { w: f.width, h: f.height, d: Buffer.from(f.data) }; } })().catch(() => {});
});
await room.connect(url, token, { autoSubscribe: false });
for (const p of room.remoteParticipants.values()) for (const pub of p.trackPublications.values()) if (pub.source === TrackSource.SOURCE_SCREENSHARE) pub.setSubscribed(true);
await sleep(8000);
try {
  const svc = new RoomServiceClient(process.env.LK_HTTP, process.env.LK_KEY, process.env.LK_SECRET);
  for (const r of await svc.listRooms()) for (const p of await svc.listParticipants(r.name)) if (p.name === "teste1")
    console.log("   LiveKit vê no teste1:", p.tracks.map((t) => `${t.source === 3 ? "TELA" : t.source === 2 ? "mic" : "src" + t.source} ${t.width}x${t.height} mudo=${t.muted} camadas=${t.layers?.length ?? 0}`).join(" + "));
} catch (e) { console.log("   (sem consulta ao LiveKit:", e.message, ")"); }
const send = await ev(`(async()=>{const r=window.__cohleRoom;if(!r)return 'sem hook';const pub=[...r.localParticipant.videoTrackPublications.values()].find(p=>p.source==='screen_share');const t=pub&&pub.track;if(!t)return 'sem faixa';const a=await t.getSenderStats();return JSON.stringify((a||[]).map(x=>({camada:x.rid||'única',fps:x.framesPerSecond,enviados:x.framesSent,largura:x.frameWidth,altura:x.frameHeight,alvoKbps:Math.round((x.targetBitrate||0)/1000),limite:x.qualityLimitationReason})))})()`);
console.log("   estatísticas de ENVIO do app:", send);
const vid = await ev(`(()=>{const v=[...document.querySelectorAll('video')].find(v=>v.videoWidth>0);return v?{w:v.videoWidth,h:v.videoHeight,t:+v.currentTime.toFixed(1),q:v.getVideoPlaybackQuality().totalVideoFrames}:null})()`);
console.log("   prévia no app:", JSON.stringify(vid));
const f0 = st?.frames ?? 0, t0 = Date.now(); await sleep(8000);      // steady state: after the warm-up, what a viewer really gets
const steady = st ? (st.frames - f0) / ((Date.now() - t0) / 1000) : 0;
console.log(`   regime estável (8 s depois do aquecimento): ${steady.toFixed(1)} quadros/s, ${st?.w}x${st?.h}`);
ok("o segundo participante recebe vídeo do compartilhamento", !!st && st.frames > 40, st ? `${st.frames} quadros, ${(st.frames / ((Date.now() - st.t0) / 1000)).toFixed(1)} fps, ${st.w}x${st.h}, de ${st.from}` : "nada recebido");

// ---- 3) is it THE DESKTOP? compare with the real screenshot ----
function bmpGrid(buf, gw, gh) {                    // average colour in a gw x gh grid of an uncompressed BMP
  const off = buf.readUInt32LE(10), W = buf.readInt32LE(18), Hraw = buf.readInt32LE(22), H = Math.abs(Hraw), bpp = buf.readUInt16LE(28) / 8, row = Math.ceil((W * bpp) / 4) * 4;
  const out = Array.from({ length: gw * gh }, () => [0, 0, 0, 0]);
  for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) {
    const sy = Hraw > 0 ? H - 1 - y : y, o = off + sy * row + x * bpp, c = out[Math.floor((y / H) * gh) * gw + Math.floor((x / W) * gw)];
    c[0] += buf[o + 2]; c[1] += buf[o + 1]; c[2] += buf[o]; c[3]++;
  }
  return out.map((c) => c.slice(0, 3).map((v) => v / c[3]));
}
function rgbaGrid(img, gw, gh) {
  const out = Array.from({ length: gw * gh }, () => [0, 0, 0, 0]);
  for (let y = 0; y < img.h; y += 3) for (let x = 0; x < img.w; x += 3) { const o = (y * img.w + x) * 4, c = out[Math.floor((y / img.h) * gh) * gw + Math.floor((x / img.w) * gw)]; c[0] += img.d[o]; c[1] += img.d[o + 1]; c[2] += img.d[o + 2]; c[3]++; }
  return out.map((c) => c.slice(0, 3).map((v) => v / c[3]));
}
if (last) {
  const a = rgbaGrid(last, ...GRID), b = bmpGrid(readFileSync(shotPath), ...GRID);
  const per = a.map((c, i) => (Math.abs(c[0] - b[i][0]) + Math.abs(c[1] - b[i][1]) + Math.abs(c[2] - b[i][2])) / 3).sort((x, y) => x - y);
  const diff = per[Math.floor(per.length / 2)];                    // median region: robust to the animated window / the Cohle window itself changing
  const close = per.filter((d) => d < 25).length / per.length;
  const mean = (g) => g.reduce((s, c) => s + (c[0] + c[1] + c[2]) / 3, 0) / g.length;
  const colorful = new Set(a.map((c) => `${c[0] >> 5}${c[1] >> 5}${c[2] >> 5}`)).size;
  ok("fluidez: pelo menos 10 quadros/s no regime estável", steady >= 10, `${steady.toFixed(1)} quadros/s`);
  ok("a imagem recebida NÃO é preta", mean(a) > 8, `brilho médio ${mean(a).toFixed(0)}/255`);
  ok("a imagem tem conteúdo variado (é uma tela, não uma cor lisa)", colorful >= 8, `${colorful} tons distintos`);
  ok("a imagem recebida é a MESMA do desktop real (mediana das regiões)", diff < 18 && close > 0.6, `diferença mediana ${diff.toFixed(1)}/255 (0 = idêntico), ${(close * 100).toFixed(0)}% das regiões batem`);
  ok("proporção da tela preservada", Math.abs(last.w / last.h - 16 / 10) < 0.2 || Math.abs(last.w / last.h - 16 / 9) < 0.2, `${last.w}x${last.h}`);
  writeFileSync("/tmp/received-frame.rgba", last.d); writeFileSync("/tmp/received-frame.json", JSON.stringify({ w: last.w, h: last.h }));
}
await room.disconnect(); motion.kill();
await click("Sair da chamada"); await sleep(1500);
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
