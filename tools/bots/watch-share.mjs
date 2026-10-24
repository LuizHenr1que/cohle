// Diagnostic: waits until someone shares a screen in the production test server, then joins as teste2,
// watches 9 s and reports whether the received frames contain a real image (or are all black).
//   node watch-share.mjs [email] [password]
import { Room, RoomEvent, VideoStream, TrackKind, TrackSource, VideoBufferType } from "@livekit/rtc-node";
import { RoomServiceClient } from "livekit-server-sdk";

const API = "https://cohle-api.onrender.com";
const LK = { url: process.env.LK_HTTP, key: process.env.LK_KEY, secret: process.env.LK_SECRET };
const [email, password] = [process.argv[2] ?? "teste2@cohle.dev", process.argv[3] ?? process.env.TESTE2_PW];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const http = async (p, m = "GET", b, t) => { const r = await fetch(API + p, { method: m, headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(t ? { Authorization: "Bearer " + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };

const svc = new RoomServiceClient(LK.url, LK.key, LK.secret);
console.log("aguardando alguém compartilhar a tela (até 10 min)...");
let found = null;
for (let i = 0; i < 120 && !found; i++) {
  try {
    for (const r of await svc.listRooms()) for (const p of await svc.listParticipants(r.name))
      if (p.tracks.some((t) => t.source === 3)) found = { room: r.name, who: p.name, t: p.tracks.find((t) => t.source === 3) };
  } catch { /* room vanished between calls */ }
  if (!found) await sleep(5000);
}
if (!found) { console.log("ninguém compartilhou a tela nesse tempo"); process.exit(1); }
console.log(`${found.who} está compartilhando: ${found.t.width}x${found.t.height}, camadas ${found.t.layers?.length ?? 0}, mudo=${found.t.muted}`);

const login = await http("/auth/login", "POST", { email, password });
const { token, url } = (await http(`/channels/${found.room}/voice-token`, "POST", undefined, login.d.token)).d;
const room = new Room(); let st = null;
const watch = (track, p) => {
  st = { from: p.name, frames: 0, w: 0, h: 0, sum: 0, max: 0, colors: new Set(), t0: Date.now() };
  (async () => { for await (const ev of new VideoStream(track)) {
    const f = ev.frame.convert(VideoBufferType.RGBA); st.w = f.width; st.h = f.height; st.frames++;
    const d = f.data; let s = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 997) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; s += l; n++; st.max = Math.max(st.max, l); st.colors.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4)); }
    st.sum += s / n; } })().catch(() => {});
};
room.on(RoomEvent.TrackSubscribed, (t, pub, p) => { if (t.kind === TrackKind.KIND_VIDEO && pub.source === TrackSource.SOURCE_SCREENSHARE) watch(t, p); });
await room.connect(url, token, { autoSubscribe: false });
for (const p of room.remoteParticipants.values()) for (const pub of p.trackPublications.values()) if (pub.source === TrackSource.SOURCE_SCREENSHARE) pub.setSubscribed(true);
await sleep(9000);
if (!st?.frames) console.log("RESULTADO: a faixa existe, mas NENHUM quadro chegou (o app publicou e não enviou imagem)");
else {
  const secs = (Date.now() - st.t0) / 1000;
  console.log(`recebido: ${st.frames} quadros em ${secs.toFixed(1)}s (${(st.frames / secs).toFixed(1)} fps), ${st.w}x${st.h}`);
  console.log(`brilho médio ${(st.sum / st.frames).toFixed(1)}/255, pico ${st.max.toFixed(0)}, cores distintas ${st.colors.size}`);
  console.log(st.max < 8 ? "RESULTADO: imagem PRETA. O macOS não liberou a Gravação de Tela para o Cohle." : st.colors.size < 4 ? "RESULTADO: imagem quase uniforme" : "RESULTADO: a transmissão TEM imagem de verdade (o problema é de exibição, não de envio)");
}
await room.disconnect(); process.exit(0);
