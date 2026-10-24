// Fills a THROW-AWAY Cohle server with friendly fictional people, a server and a conversation (for screenshots).
//   node demo-seed.mjs --api http://localhost:3002
import { io } from "socket.io-client";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d; };
const API = arg("api", "http://localhost:3002");
export const PASSWORD = "demo-pass-123";
export const PEOPLE = ["Ana", "Bruno", "Carla", "Diego", "Elisa", "Felipe", "Gabi", "Hugo"];
const email = (n) => `${n.toLowerCase()}@demo.cohle.dev`;

async function http(path, method = "GET", body, token) {
  const r = await fetch(API + path, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${d.error ?? ""}`);
  return d;
}
async function account(name) {
  try { return await http("/auth/login", "POST", { email: email(name), password: PASSWORD }); }
  catch { return await http("/auth/register", "POST", { email: email(name), username: name, password: PASSWORD }); }
}

const accounts = {};
for (const n of PEOPLE) accounts[n] = await account(n);
const ana = accounts.Ana;
let server = (await http("/servers", "GET", undefined, ana.token)).find((s) => s.name === "Cohle Squad");
if (!server) server = await http("/servers", "POST", { name: "Cohle Squad", template: "friends" }, ana.token);
for (const n of PEOPLE.slice(1)) await http(`/servers/join/${server.inviteCode}`, "POST", undefined, accounts[n].token);
server = (await http("/servers", "GET", undefined, ana.token)).find((s) => s.name === "Cohle Squad");
const text = server.channels.find((c) => c.name === "geral");

const script = [
  ["Ana", "Bom dia, pessoal! Hoje à noite tem partida às 21h"],
  ["Bruno", "Confirmado! Já deixei o Cohle aberto, a qualidade da voz está muito boa"],
  ["Carla", "Eu vou compartilhar a tela pra vocês verem o replay da última rodada"],
  ["Diego", "Isso! E dá pra assistir só quando quiser, não pesa nada no PC"],
  ["Elisa", "Testei aqui em segundo plano com o jogo aberto e não travou nada"],
  ["Felipe", "Alguém me ajuda a baixar o instalador do Windows?"],
  ["Gabi", "Mandei o link no privado. É só colar o endereço do servidor"],
  ["Hugo", "Entrando na sala de voz agora!"],
];
const sockets = {};
for (const n of new Set(script.map(([n]) => n))) {
  sockets[n] = io(API, { auth: { token: accounts[n].token } });
  await new Promise((r) => sockets[n].on("connect", r));
  sockets[n].emit("channel:join", text.id);
}
await new Promise((r) => setTimeout(r, 500));
const have = (await http(`/channels/${text.id}/messages`, "GET", undefined, ana.token)).length;
if (have === 0) for (const [n, msg] of script) { sockets[n].emit("message:send", { channelId: text.id, content: msg }); await new Promise((r) => setTimeout(r, 250)); }
await new Promise((r) => setTimeout(r, 600));
console.log(JSON.stringify({ server: server.name, channels: server.channels.map((c) => c.name), messages: have === 0 ? script.length : have }));
Object.values(sockets).forEach((s) => s.close());
process.exit(0);
