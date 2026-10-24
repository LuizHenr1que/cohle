// Verifies, against the running stack with bots in the room:
//   1) there is real audio on every microphone and on each shared screen ("ao vivo")
//   2) owner moderation works at the SFU: mute, disconnect, ban/unban (and non-owners are refused)
// Needs `node bots.mjs --count 8 --share 2` running. Usage: node check.mjs
import { Room, RoomEvent, AudioStream, TrackSource, TrackKind } from "@livekit/rtc-node";

const API = "http://localhost:3001";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (label, cond, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  — " + extra : ""}`); };

async function http(path, method = "GET", body, token) {
  const res = await fetch(API + path, {
    method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { s: res.status, d: await res.json().catch(() => ({})) };
}
const login = async (email, password) => (await http("/auth/login", "POST", { email, password })).d;
const jwtGrant = (jwt) => JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()).video;

const owner = await login("teste1@cohle.dev", "teste12345");
const listener = await login("teste2@cohle.dev", "teste12345");
const server = (await http("/servers", "GET", undefined, owner.token)).d.find((s) => s.name === "Servidor de Teste");
const voice = server.channels.find((c) => c.type === "VOICE");
const members = (await http(`/servers/${server.id}/members`, "GET", undefined, owner.token)).d;
const idOf = (name) => members.find((m) => m.user.username === name)?.user.id;

// ---- listener joins the room and measures audio energy per (participant, source) ----
const { token, url } = (await http(`/channels/${voice.id}/voice-token`, "POST", undefined, listener.token)).d;
const room = new Room();
const energy = new Map();   // key -> { sumSq, n, peak }
const names = { [TrackSource.SOURCE_MICROPHONE]: "mic", [TrackSource.SOURCE_SCREENSHARE_AUDIO]: "ao-vivo(áudio)" };
const seenPublished = new Set(), events = [];
room.on(RoomEvent.TrackSubscribed, (track, pub, p) => {
  if (track.kind !== TrackKind.KIND_AUDIO) return;
  const key = `${p.name ?? p.identity}:${names[pub.source] ?? pub.source}`;
  energy.set(key, { sumSq: 0, n: 0, peak: 0 });
  (async () => {
    for await (const f of new AudioStream(track)) {
      const e = energy.get(key); if (!e) break;
      for (let i = 0; i < f.data.length; i++) { const v = f.data[i] / 32768; e.sumSq += v * v; e.peak = Math.max(e.peak, Math.abs(v)); }
      e.n += f.data.length;
    }
  })().catch(() => {});
});
room.on(RoomEvent.TrackUnpublished, (pub, p) => events.push(`unpublished:${p.name}:${names[pub.source] ?? pub.source}`));
room.on(RoomEvent.ParticipantDisconnected, (p) => events.push(`left:${p.name}`));
await room.connect(url, token, { autoSubscribe: true });
console.log(`Ouvinte conectado. Medindo áudio por 14 s (${room.remoteParticipants.size} participantes)...\n`);
await sleep(14000);

const rms = (k) => { const e = energy.get(k); return e && e.n ? Math.sqrt(e.sumSq / e.n) : 0; };
console.log("— 1) ÁUDIO —");
const sharers = ["bot1", "bot2"];
for (const s of sharers) {
  const e = energy.get(`${s}:ao-vivo(áudio)`);
  ok(`${s}: o "ao vivo" tem som`, !!e && e.peak > 0.05 && rms(`${s}:ao-vivo(áudio)`) > 0.02, e ? `pico ${e.peak.toFixed(2)}, rms ${rms(`${s}:ao-vivo(áudio)`).toFixed(3)}` : "faixa não recebida");
}
let talkers = 0;
for (let n = 1; n <= 8; n++) { const e = energy.get(`bot${n}:mic`); if (e && e.peak > 0.05) talkers++; }
ok("microfones com som (de 8 bots, que falam e param ao acaso)", talkers >= 5, `${talkers}/8 já falaram nessa janela`);

// ---- moderation ----
console.log("\n— 2) DONO: silenciar / desconectar / banir —");
const b3 = idOf("bot3"), b4 = idOf("bot4"), b5 = idOf("bot5");

ok("quem não é dono NÃO consegue silenciar", (await http(`/servers/${server.id}/members/${b3}/mute`, "POST", { muted: true }, listener.token)).s === 403);
ok("quem não é dono NÃO consegue desconectar", (await http(`/servers/${server.id}/members/${b4}/voice-disconnect`, "POST", undefined, listener.token)).s === 403);
ok("quem não é dono NÃO consegue banir", (await http(`/servers/${server.id}/bans`, "POST", { userId: b5 }, listener.token)).s === 403);

// mute bot3
energy.get("bot3:mic") && (energy.get("bot3:mic").peak = 0);
events.length = 0;
const m = await http(`/servers/${server.id}/members/${b3}/mute`, "POST", { muted: true }, owner.token);
ok("dono silencia bot3", m.s === 200);
await sleep(4000);
ok("o servidor tirou o microfone do bot3 da sala (LiveKit)", events.some((e) => e === "unpublished:bot3:mic"), events.join(", "));
const tokMuted = (await http(`/channels/${voice.id}/voice-token`, "POST", undefined, (await login("bot3@cohle.dev", "bot-password-123")).token)).d.token;
ok("se bot3 reentrar, o token dele já vem SEM permissão de falar", jwtGrant(tokMuted).canPublish === false);
const memberRow = (await http(`/servers/${server.id}/members`, "GET", undefined, owner.token)).d.find((x) => x.user.id === b3);
ok("a lista de membros mostra bot3 silenciado", memberRow?.muted === true);
await http(`/servers/${server.id}/members/${b3}/mute`, "POST", { muted: false }, owner.token);
const tokOk = (await http(`/channels/${voice.id}/voice-token`, "POST", undefined, (await login("bot3@cohle.dev", "bot-password-123")).token)).d.token;
ok("ao desfazer, o token volta a permitir falar", jwtGrant(tokOk).canPublish === true);

// disconnect bot4
events.length = 0;
const d = await http(`/servers/${server.id}/members/${b4}/voice-disconnect`, "POST", undefined, owner.token);
ok("dono desconecta bot4 da chamada", d.s === 200);
await sleep(3000);
ok("bot4 saiu da sala de verdade", events.includes("left:bot4"), events.join(", "));
ok("desconectado continua membro do servidor", (await http(`/servers/${server.id}/members`, "GET", undefined, owner.token)).d.some((x) => x.user.id === b4));

// ban bot5
events.length = 0;
const bn = await http(`/servers/${server.id}/bans`, "POST", { userId: b5 }, owner.token);
ok("dono bane bot5", bn.s === 200);
await sleep(3000);
ok("bot5 foi tirado da sala", events.includes("left:bot5"), events.join(", "));
ok("bot5 não é mais membro", !(await http(`/servers/${server.id}/members`, "GET", undefined, owner.token)).d.some((x) => x.user.id === b5));
const b5login = await login("bot5@cohle.dev", "bot-password-123");
const retry = await http(`/servers/join/${server.inviteCode}`, "POST", undefined, b5login.token);
ok("bot5 tenta voltar com o convite e é RECUSADO", retry.s === 403, retry.d.error);
ok("aparece na lista de banidos", (await http(`/servers/${server.id}/bans`, "GET", undefined, owner.token)).d.some((x) => x.user.id === b5));
ok("banido não pega token de voz", (await http(`/channels/${voice.id}/voice-token`, "POST", undefined, b5login.token)).s === 403);
await http(`/servers/${server.id}/bans/${b5}`, "DELETE", undefined, owner.token);
ok("depois de desbanido, consegue entrar de novo", (await http(`/servers/join/${server.inviteCode}`, "POST", undefined, b5login.token)).s === 200);

await room.disconnect();
console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
