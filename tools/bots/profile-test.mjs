// Display name, bio, banner colour, friends-since, private notes, live activity, mutual friends/servers, suggestions. Dev API (OWNER_EMAILS=teste1@cohle.dev, EMAIL_DEV=1), log in SERVER_LOG.
import { readFileSync } from "node:fs";
import { io } from "../bots/node_modules/socket.io-client/build/esm/index.js";
const API = "http://localhost:3001", LOG = process.env.SERVER_LOG;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const last = (re) => [...readFileSync(LOG, "utf8").matchAll(re)].at(-1)?.[1];
const run = Date.now().toString(36).slice(-6), pw = "senhaSegura123";
const mk = async (name) => { const email = `${name}.${run}@cohle.dev`; const r = await http("/auth/register", { email, username: `${name}_${run}`, password: pw }); if (r.d.token) return r.d; await sleep(500); return (await http("/auth/verify", { email, code: last(/Seu código do Cohle: (\d{6})/g) })).d; };
const befriend = async (x, y) => { await http("/friends/request", { handle: "@" + y.user.username }, x.token); const f = (await http("/friends", null, y.token)).d.incoming.find((r) => r.user.id === x.user.id); await http(`/friends/${f.id}/accept`, {}, y.token); };
const owner = (await http("/auth/login", { email: "teste1@cohle.dev", password: "teste12345" })).d;
const [A, B, C, D] = [await mk("ana"), await mk("bia"), await mk("caio"), await mk("dani")];
const profile = async (viewer, target) => (await http(`/users/${target.user.id}/profile`, null, viewer.token)).d;

// ---- display name ----
let r = await http("/me", { displayName: "  Ana   Maria  " }, A.token, "PATCH"); ok("nome de exibição: espaços extras são limpos", r.s === 200 && r.d.displayName === "Ana Maria", r.d.displayName);
r = await http("/me", { displayName: "A​n‮a" }, A.token, "PATCH"); ok("caracteres invisíveis/de direção são removidos", r.d.displayName === "Ana", JSON.stringify(r.d.displayName));
ok("mais de 32 caracteres é recusado", (await http("/me", { displayName: "x".repeat(33) }, A.token, "PATCH")).s === 400);
for (const bad of ["Admin", "su porte", "C.o.h.l.e", "ADMINISTRADOR"]) ok(`nome que se passa pela equipe é recusado: "${bad}"`, (await http("/me", { displayName: bad }, A.token, "PATCH")).s === 400);
ok("o Dono pode usar o nome reservado", (await http("/me", { displayName: "Admin" }, owner.token, "PATCH")).s === 200);
await http("/me", { displayName: null }, owner.token, "PATCH");
await http("/me", { displayName: "Ana Maria" }, A.token, "PATCH"); await http("/me", { displayName: "Ana Maria" }, B.token, "PATCH");
ok("duas pessoas podem ter o mesmo nome de exibição (o @ é que é único)", (await http("/me", null, B.token)).d.displayName === "Ana Maria");
ok("/me traz o nome e o @ continua o mesmo", (await http("/me", null, A.token)).d.username === `ana_${run}`);
r = await http("/me", { displayName: "" }, B.token, "PATCH"); ok("vazio limpa o nome de exibição", r.s === 200 && r.d.displayName === undefined);
r = await http("/me", { displayName: "Novo Dono" }, owner.token, "PATCH"); ok("salvar o perfil não derruba o papel de Dono", r.d.role === "OWNER", String(r.d.role));
await http("/me", { displayName: null }, owner.token, "PATCH");
// ---- bio and banner ----
r = await http("/me", { bio: "Oi!\r\n\r\n\r\nGosto de jogar.\u0007", bannerColor: "#FF8800" }, A.token, "PATCH");
ok("descrição mantém quebra de linha e limpa lixo", r.s === 200 && r.d.bio === "Oi!\n\nGosto de jogar.", JSON.stringify(r.d.bio));
ok("cor da capa é guardada em minúsculas", r.d.bannerColor === "#ff8800");
ok("descrição com mais de 190 é recusada", (await http("/me", { bio: "x".repeat(191) }, A.token, "PATCH")).s === 400);
ok("cor inválida é recusada", (await http("/me", { bannerColor: "vermelho" }, A.token, "PATCH")).s === 400 && (await http("/me", { bannerColor: "#12345" }, A.token, "PATCH")).s === 400);
// ---- friendships, profile visibility, mutuals ----
await befriend(A, B); await befriend(A, C); await befriend(B, C);
const pb = await profile(B, A);
ok("perfil mostra descrição e cor da capa", pb.bio?.startsWith("Oi!") && pb.bannerColor === "#ff8800");
ok("perfil mostra o nome de exibição", pb.user.displayName === "Ana Maria" && pb.user.username === `ana_${run}`);
ok("perfil mostra 'amigos desde'", pb.relation === "friend" && !!pb.friendSince && Math.abs(Date.now() - new Date(pb.friendSince)) < 60_000);
const fr = (await http("/friends", null, B.token)).d.friends.find((f) => f.user.id === A.user.id);
ok("a lista de amigos usa a mesma data", fr && fr.since === pb.friendSince);
ok("perfil mostra 'membro desde'", !!pb.createdAt);
const pc = await profile(B, C);
ok("amigos em comum: B vê A no perfil de C", pc.mutualFriendsCount === 1 && pc.mutualFriends[0].id === A.user.id, JSON.stringify(pc.mutualFriends.map((u) => u.username)));
ok("no próprio perfil não há amigos em comum nem nota", (await profile(A, A)).mutualFriendsCount === 0 && (await profile(A, A)).note === undefined);
// ---- private note ----
r = await http(`/users/${A.user.id}/note`, { text: "  Colega do trabalho  " }, B.token, "PUT"); ok("nota privada é salva", r.s === 200);
ok("quem escreveu vê a nota", (await profile(B, A)).note === "Colega do trabalho");
ok("a outra pessoa NÃO vê a nota", (await profile(C, A)).note === undefined && (await profile(A, B)).note === undefined);
ok("nota com mais de 256 é recusada", (await http(`/users/${A.user.id}/note`, { text: "x".repeat(257) }, B.token, "PUT")).s === 400);
ok("não dá para escrever nota sobre si mesmo", (await http(`/users/${B.user.id}/note`, { text: "eu" }, B.token, "PUT")).s === 400);
ok("sem servidor nem amizade em comum: recusado", (await http(`/users/${D.user.id}/note`, { text: "quem?" }, B.token, "PUT")).s === 403 && (await http(`/users/${D.user.id}/profile`, null, B.token)).s === 403);
await http(`/users/${A.user.id}/note`, { text: "" }, B.token, "PUT"); ok("texto vazio apaga a nota", (await profile(B, A)).note === undefined);
// ---- servers: shared, suggestions ----
const s1 = (await http("/servers", { name: "Servidor " + run }, A.token)).d, s2 = (await http("/servers", { name: "Outro " + run }, A.token)).d;
await http(`/servers/join/${s1.inviteCode}`, {}, D.token); await http(`/servers/join/${s2.inviteCode}`, {}, D.token); await http(`/servers/join/${s1.inviteCode}`, {}, B.token);
const E = await mk("edu"); await http(`/servers/join/${s1.inviteCode}`, {}, E.token);
ok("servidores em comum no perfil", (await profile(D, A)).mutual.length === 2);
const sug = (await http("/friends/suggestions", null, A.token)).d;
ok("sugestões: quem divide servidor e ainda não é amigo", sug.some((x) => x.user.id === D.user.id) && sug.some((x) => x.user.id === E.user.id), sug.map((x) => x.user.username).join(","));
ok("sugestões: não inclui amigos nem a própria pessoa", !sug.some((x) => [A, B, C].some((u) => u.user.id === x.user.id)));
ok("sugestões: quem divide mais servidores vem primeiro", sug[0].user.id === D.user.id && sug[0].count === 2, `${sug[0]?.user.username} x${sug[0]?.count}`);
await http("/friends/request", { handle: "@" + E.user.username }, A.token);
ok("sugestões: depois do pedido, a pessoa sai da lista", !(await http("/friends/suggestions", null, A.token)).d.some((x) => x.user.id === E.user.id));
ok("sem servidor: lista vazia", (await http("/friends/suggestions", null, C.token)).d.length === 0);
// ---- live activity ----
const sk = io(API, { auth: { token: D.token }, transports: ["websocket"] }); await new Promise((x) => sk.on("connect", x)); await sleep(500);
ok("atividade: online", (await profile(A, D)).activity.kind === "online");
const ch = s1.channels.find((c) => c.type === "VOICE"); sk.emit("voice:join", ch.id); await sleep(1200);
const act = (await profile(A, D)).activity; ok("atividade: em chamada, com o lugar para quem está no mesmo servidor", act.kind === "voice" && act.where === `${ch.name} · ${s1.name}`, JSON.stringify(act));
await befriend(C, D);
const actC = (await profile(C, D)).activity; ok("atividade: quem NÃO está no servidor vê só 'em chamada', sem o lugar", actC.kind === "voice" && actC.where === undefined, JSON.stringify(actC));
sk.emit("voice:sharing", true); await sleep(900); ok("atividade: compartilhando a tela", (await profile(A, D)).activity.kind === "sharing");
sk.close(); await sleep(1500); ok("atividade: offline depois de sair", (await profile(A, D)).activity.kind === "offline");
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
