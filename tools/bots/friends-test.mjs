// Friends API: add by @username, requests, accept, online flag, removal. Dev server. (E-mail adds, suggestions and privacy: identity-test.mjs / profile-test.mjs)
import { io } from "../bots/node_modules/socket.io-client/build/esm/index.js";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = "http://localhost:3001";
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const login = async (e) => (await http("/auth/login", { email: e, password: "teste12345" })).d;
const a = await login("teste1@cohle.dev"), b = await login("teste2@cohle.dev");
// clean slate for the pair
await http(`/friends/${b.user.id}`, null, a.token, "DELETE");
const fl = async (t) => (await http("/friends", null, t)).d;
ok("os usuários de teste têm @usuário", a.user.username === "teste1" && b.user.username === "teste2", `@${a.user.username} @${b.user.username}`);
let r = await http("/friends/request", { handle: "@nao_existe_zz" }, a.token);
ok("@usuário inexistente: não encontra", r.s === 404);
r = await http("/friends/request", { handle: "@teste1#te01" }, a.token);
ok("não dá para adicionar a si mesmo", r.s === 400);
r = await http("/friends/request", { handle: "isso-nao-eh-handle" }, a.token);
ok("formato inválido é recusado", r.s === 400);
const sb = io(API, { auth: { token: b.token }, transports: ["websocket"] }); await new Promise((rr) => sb.on("connect", rr)); let pinged = 0; sb.on("friends:update", () => pinged++);
r = await http("/friends/request", { handle: "@TESTE2 #TE02" }, a.token);
ok("pedido por @nome #código (sem diferenciar maiúsculas)", r.s === 200 && r.d.status === "sent");
await sleep(400); ok("o outro lado é avisado em tempo real", pinged >= 1);
ok("aparece como enviado para quem pediu", (await fl(a.token)).outgoing.length === 1);
const inc = (await fl(b.token)).incoming; ok("e como recebido para quem foi convidado", inc.length === 1 && inc[0].user.username === "teste1");
r = await http("/friends/request", { handle: "teste2#te02" }, a.token); ok("pedir de novo é recusado", r.s === 409);
r = await http(`/friends/${inc[0].id}/accept`, {}, a.token); ok("quem pediu não pode aceitar o próprio pedido", r.s === 404);
r = await http(`/friends/${inc[0].id}/accept`, {}, b.token); ok("quem recebeu aceita", r.s === 200);
const la = await fl(a.token);
const has = (l, u) => l.friends.some((f) => f.user.id === u.user.id), pend = (l, u) => [...l.incoming, ...l.outgoing].some((r) => r.user.id === u.user.id);       // other tests leave other friends around: look only at this pair
ok("viram amigos nos dois lados", has(la, b) && has(await fl(b.token), a) && !pend(la, b));
ok("amigo online aparece como online", la.friends[0].online === true);
sb.close(); await sleep(800);
ok("depois que sai, aparece offline", (await fl(a.token)).friends[0].online === false);
const dm = await new Promise((rr) => { const s = io(API, { auth: { token: a.token }, transports: ["websocket"] }); s.on("connect", () => s.emit("dm:send", { toId: b.user.id, content: "oi amigo" }, (x) => { s.close(); rr(x); })); });
ok("amigos podem trocar mensagem direta", dm?.ok === true);
const pr = (await http(`/users/${b.user.id}/profile`, null, a.token)).d; ok("o perfil mostra que são amigos", pr.relation === "friend");
r = await http(`/friends/${b.user.id}`, null, a.token, "DELETE"); ok("remover amizade", r.s === 200 && !has(await fl(a.token), b));
// both ask each other: the second request just accepts
await http("/friends/request", { handle: "teste2#te02" }, a.token); r = await http("/friends/request", { handle: "teste1#te01" }, b.token);
ok("se os dois pedem, o segundo pedido já aceita", r.d.status === "accepted" && has(await fl(a.token), b));
await http(`/friends/${b.user.id}`, null, a.token, "DELETE");
// cancel / decline
await http("/friends/request", { handle: "teste2#te02" }, a.token); const out = (await fl(a.token)).outgoing[0];
r = await http(`/friends/${out.id}/decline`, {}, a.token); ok("quem pediu pode cancelar o pedido", r.s === 200 && (await fl(a.token)).outgoing.length === 0);
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
