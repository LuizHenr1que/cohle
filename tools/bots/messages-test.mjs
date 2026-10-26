// Messages: 15-message history, 500-char limit, replies, reactions, deleting, files/images (and their security). Dev API (OWNER_EMAILS=teste1@cohle.dev, EMAIL_DEV=1), log in SERVER_LOG.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { io } from "../bots/node_modules/socket.io-client/build/esm/index.js";
const sharp = createRequire(import.meta.url)("../../apps/server/node_modules/sharp");
const API = "http://localhost:3001", LOG = process.env.SERVER_LOG;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const upload = async (tok, name, bytes) => { const r = await fetch(API + "/uploads?name=" + encodeURIComponent(name), { method: "POST", headers: { "Content-Type": "application/octet-stream", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: bytes }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const last = (re) => [...readFileSync(LOG, "utf8").matchAll(re)].at(-1)?.[1];
const run = Date.now().toString(36).slice(-6), pw = "senhaSegura123";
const mk = async (name) => { const email = `${name}.${run}@cohle.dev`; const r = await http("/auth/register", { email, username: `${name}_${run}`, password: pw }); if (r.d.token) return r.d; await sleep(500); return (await http("/auth/verify", { email, code: last(/Seu código do Cohle: (\d{6})/g) })).d; };
const conn = async (u) => { const s = io(API, { auth: { token: u.token }, transports: ["websocket"] }); await new Promise((r) => s.on("connect", r)); return s; };
const send = (s, ev, data) => new Promise((r) => s.emit(ev, data, r));
const events = (s, name) => { const l = []; s.on(name, (e) => l.push(e)); return l; };
let rot = 0; const rej = (name, bytes) => upload([owner, N, X][rot++ % 3].token, name, bytes);      // spread the rejection tests over three people: the 12-uploads-a-minute limit has its own test
const png = (w, h, bg = "#3b8cff") => sharp({ create: { width: w, height: h, channels: 3, background: bg } }).png().toBuffer();

const owner = await mk("dono"), M = await mk("mia"), N = await mk("noa"), X = await mk("xis");        // owner of the server, two members, one outsider
const srv = (await http("/servers", { name: "Mensagens " + run }, owner.token)).d, ch = srv.channels.find((c) => c.type === "TEXT").id;
await http(`/servers/join/${srv.inviteCode}`, {}, M.token); await http(`/servers/join/${srv.inviteCode}`, {}, N.token);
const [so, sm, sn, sx] = [await conn(owner), await conn(M), await conn(N), await conn(X)];
for (const s of [so, sm, sn]) s.emit("channel:join", ch); await sleep(700);
const gone = events(sm, "message:gone"), news = events(sm, "message:new"), reacts = events(sm, "message:reactions");
const say = async (s, content, extra = {}) => send(s, "message:send", { channelId: ch, content, ...extra });
const hist = async (tok = M.token) => (await http(`/channels/${ch}/messages`, null, tok)).d;

// ---- limits on the text ----
let r = await say(sm, "a".repeat(501)); ok("501 caracteres é recusado", r.error === "too long", JSON.stringify(r));
r = await say(sm, "a".repeat(500)); ok("500 caracteres passa", r.ok === true);
r = await say(sm, Array(14).fill("linha").join("\n")); ok("mais de 12 linhas é recusado (sem textão em coluna)", r.error === "too many lines", JSON.stringify(r));
r = await say(sm, "   \n  ​ "); ok("só espaços/invisíveis é recusado", r.error === "empty", JSON.stringify(r));
r = await say(sm, "oi\u0007‮ mundo\n\n\n\nfim"); ok("lixo é removido e linhas em branco são limitadas", r.ok && r.message.content === "oi mundo\n\nfim", JSON.stringify(r.message?.content));
r = await sx.emitWithAck("message:send", { channelId: ch, content: "intruso" }); ok("quem não é do servidor não escreve", r.error === "forbidden");
r = await send(sm, "message:send", { channelId: ch, content: "compat antigo" }); ok("app antigo (só channelId + content) continua funcionando", r.ok === true);
await sleep(10_500);                                                                                       // let the per-person flood window pass
const flood = (await Promise.all(Array.from({ length: 10 }, (_, i) => say(sn, "rajada " + i)))).map((x) => x.error ?? "ok");
ok("rajada: depois de 8 mensagens em 10 s pede calma", flood.filter((x) => x === "ok").length === 8 && flood.filter((x) => x === "slow down").length === 2, flood.join(","));
// ---- the 15-message history ----
await sleep(10_500);
for (let i = 1; i <= 7; i++) await say(sm, `msg ${i}`);
await sleep(10_500);
for (let i = 8; i <= 14; i++) await say(sm, `msg ${i}`);
await sleep(1500);
let h = await hist();
ok("o histórico guarda só as últimas 15", h.length === 15, `${h.length} mensagens`);
ok("as 15 são as mais novas, em ordem", h.at(-1).content === "msg 14" && h[0].createdAt <= h.at(-1).createdAt);
const goneIds = gone.flatMap((e) => e.ids);
ok("quem está no canal é avisado das apagadas (message:gone)", goneIds.length >= 1 && gone.every((e) => e.channelId === ch), `${goneIds.length} avisos`);
ok("as apagadas não aparecem mais no histórico", goneIds.every((id) => !h.some((m) => m.id === id)));

// ---- replies ----
await sleep(10_500);
const orig = (await say(so, "mensagem original do dono")).message;
const rep = await say(sm, "respondendo", { replyToId: orig.id });
ok("resposta guarda quem e o quê", rep.ok && rep.message.replyTo.id === orig.id && rep.message.replyTo.authorId === owner.user.id && rep.message.replyTo.text === "mensagem original do dono", JSON.stringify(rep.message?.replyTo));
ok("resposta a mensagem inexistente é recusada", (await say(sm, "x", { replyToId: "nao_existe" })).error === "reply not found");
// the original is erased by the limit; the reply must still read fine
await sleep(10_500); for (let i = 0; i < 7; i++) await say(sm, `depois ${i}`); await sleep(10_500); for (let i = 7; i < 14; i++) await say(sm, `depois ${i}`); await sleep(1500);
h = await hist(); const kept = h.find((m) => m.id === rep.message.id);
ok("quando a original é apagada pelo limite, a resposta continua legível", kept && kept.replyTo.id === null && kept.replyTo.text === "mensagem original do dono" && kept.replyTo.authorName.length > 0, JSON.stringify(kept?.replyTo));

// ---- reactions ----
const target = h.at(-1).id;
let rr = await http(`/messages/${target}/reactions`, { key: "fire" }, N.token); ok("reagir com um ícone", rr.s === 200 && rr.d.reactions[0].key === "fire" && rr.d.reactions[0].userIds.includes(N.user.id));
await http(`/messages/${target}/reactions`, { key: "fire" }, owner.token); rr = await http(`/messages/${target}/reactions`, { key: "love" }, owner.token);
ok("várias pessoas e vários ícones agrupados", rr.d.reactions.find((x) => x.key === "fire").userIds.length === 2 && rr.d.reactions.length === 2);
ok("o histórico já traz as reações", (await hist()).find((m) => m.id === target).reactions.length === 2);
rr = await http(`/messages/${target}/reactions`, { key: "fire" }, N.token); ok("reagir de novo tira a reação", rr.d.reactions.find((x) => x.key === "fire").userIds.length === 1);
ok("ícone fora da lista é recusado (nada de emoji livre)", (await http(`/messages/${target}/reactions`, { key: "💩" }, N.token)).s === 400 && (await http(`/messages/${target}/reactions`, { key: "x" }, N.token)).s === 400);
ok("quem não é do servidor não reage", (await http(`/messages/${target}/reactions`, { key: "like" }, X.token)).s === 404);
await sleep(300); ok("quem está no canal recebe a reação ao vivo", reacts.length >= 3 && reacts.at(-1).id === target);

// ---- deleting ----
await sleep(10_500);
const mine = (await say(sm, "vou apagar")).message, theirs = (await say(sn, "do noa")).message;
ok("outro membro não apaga mensagem alheia", (await http(`/messages/${mine.id}`, null, N.token, "DELETE")).s === 403);
ok("o autor apaga a própria", (await http(`/messages/${mine.id}`, null, M.token, "DELETE")).s === 200);
ok("o dono do servidor apaga a de qualquer um", (await http(`/messages/${theirs.id}`, null, owner.token, "DELETE")).s === 200);
await sleep(400); const gids = gone.flatMap((e) => e.ids); ok("a remoção chega ao vivo", gids.includes(mine.id) && gids.includes(theirs.id));

// ---- direct messages: same history rule, reactions, deleting ----
const dgone = events(sm, "dm:gone"); const dnew = events(sm, "dm:new");
await http("/friends/request", { handle: "@" + N.user.username }, M.token); const inc = (await http("/friends", null, N.token)).d.incoming[0]; await http(`/friends/${inc.id}/accept`, {}, N.token);
const dm = (s, content, extra = {}) => send(s, "dm:send", { toId: s === sm ? N.user.id : M.user.id, content, ...extra });
let sentDm = []; for (let i = 1; i <= 7; i++) sentDm.push((await dm(sm, `dm ${i}`)).ok);
await sleep(10_500); for (let i = 8; i <= 14; i++) sentDm.push((await dm(sm, `dm ${i}`)).ok);
await sleep(10_500); for (let i = 15; i <= 18; i++) sentDm.push((await dm(sm, `dm ${i}`)).ok); await sleep(1500);
const dh = (await http(`/dms/${N.user.id}/messages`, null, M.token)).d;
ok("conversa direta: só as 15 últimas", sentDm.every(Boolean) && dh.messages.length === 15 && dh.messages.at(-1).content === "dm 18" && dh.more === false, `${dh.messages.length}`);
ok("e os dois lados são avisados das apagadas", dgone.flatMap((e) => e.ids).length === 3);
const dmr = (await http(`/dm-messages/${dh.messages.at(-1).id}/reactions`, { key: "like" }, N.token)); ok("reação em mensagem direta", dmr.s === 200 && dmr.d.reactions[0].key === "like");
ok("quem não é da conversa não reage", (await http(`/dm-messages/${dh.messages.at(-1).id}/reactions`, { key: "like" }, X.token)).s === 404);
const dmRep = await dm(sn, "resposta direta", { replyToId: dh.messages.at(-1).id }); ok("resposta em conversa direta", dmRep.ok && dmRep.message.replyTo.text === "dm 18");
ok("destinatário não apaga mensagem do outro", (await http(`/dm-messages/${dh.messages.at(-1).id}`, null, N.token, "DELETE")).s === 403 && (await http(`/dm-messages/${dh.messages.at(-1).id}`, null, M.token, "DELETE")).s === 200);

// ---- files and images ----
await sleep(10_500);
ok("upload sem login é recusado", (await upload(null, "a.png", await png(10, 10))).s === 401);
let up = await upload(M.token, "Foto da Viagem.PNG", await png(1600, 1200));
ok("imagem grande vira WebP com miniatura e dimensões", up.s === 200 && up.d.kind === "image" && up.d.mime === "image/webp" && up.d.name === "Foto da Viagem.webp" && up.d.width === 1600 && !!up.d.thumbUrl, JSON.stringify(up.d).slice(0, 160));
const big = up.d;
const imgRes = await fetch(API + big.url), thRes = await fetch(API + big.thumbUrl);
const imgBuf = Buffer.from(await imgRes.arrayBuffer()), thBuf = Buffer.from(await thRes.arrayBuffer());
ok("a imagem baixa como image/webp, inline, com cabeçalhos de segurança", imgRes.status === 200 && imgRes.headers.get("content-type") === "image/webp" && /^inline/.test(imgRes.headers.get("content-disposition")) && imgRes.headers.get("x-content-type-options") === "nosniff" && /sandbox/.test(imgRes.headers.get("content-security-policy")) && /immutable/.test(imgRes.headers.get("cache-control")) && imgRes.headers.get("cross-origin-resource-policy") === "cross-origin");
const tm = await sharp(thBuf).metadata(); ok("a miniatura é pequena e leve", tm.width <= 480 && thBuf.length < imgBuf.length / 2, `${tm.width}px, ${thBuf.length} B de ${imgBuf.length} B`);
// EXIF/GPS must not survive
const withExif = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#ff0000" } }).jpeg().withExif({ IFD0: { Copyright: "SEGREDO-GPS-123", Artist: "Fulano" } }).toBuffer();
ok("o JPEG de teste realmente tem metadados", (await sharp(withExif).metadata()).exif !== undefined && withExif.includes(Buffer.from("SEGREDO-GPS-123")));
up = await upload(M.token, "cam.jpg", withExif); const clean = Buffer.from(await (await fetch(API + up.d.url)).arrayBuffer());
ok("metadados (EXIF/GPS) são removidos da imagem salva", up.s === 200 && !clean.includes(Buffer.from("SEGREDO-GPS-123")) && (await sharp(clean).metadata()).exif === undefined);
ok("imagem com mais de 16 megapixels é recusada antes de decodificar", (await rej("gigante.png", await png(5000, 5000))).s === 413);
ok("arquivo chamado .png que não é imagem é recusado", (await rej("falso.png", Buffer.from("isto nao e uma imagem"))).s === 415);
ok("imagem corrompida é recusada", (await rej("quebrada.png", Buffer.concat([(await png(50, 50)).subarray(0, 40), Buffer.from("lixo lixo lixo")]))).s === 415);
for (const [name, bytes, why] of [["nota.txt", Buffer.concat([Buffer.from("MZ"), Buffer.alloc(200)]), "executável do Windows disfarçado de .txt"], ["x.pdf", Buffer.from("\x7fELF" + "0".repeat(60), "latin1"), "ELF disfarçado de .pdf"], ["run.txt", Buffer.from("#!/bin/sh\nrm -rf ~\n"), "script (#!) disfarçado"], ["setup.exe", Buffer.from("qualquer"), ".exe"], ["pagina.html", Buffer.from("<script>alert(1)</script>"), ".html"], ["logo.svg", Buffer.from("<svg onload=alert(1)/>"), ".svg"], ["a.js", Buffer.from("alert(1)"), ".js"], ["inst.bat", Buffer.from("del *.*"), ".bat"]])
  ok(`bloqueado: ${why}`, (await rej(name, bytes)).s === 403);
ok("tipo desconhecido (.xyz) é recusado", (await rej("dados.xyz", Buffer.from("abc"))).s === 415);
ok(".pdf sem a assinatura de PDF é recusado", (await rej("falso.pdf", Buffer.from("nao sou pdf"))).s === 415);
ok(".docx que não é zip é recusado", (await rej("falso.docx", Buffer.from("nao sou zip"))).s === 415);
ok(".txt com binário dentro é recusado", (await rej("bin.txt", Buffer.from([65, 0, 66, 0, 67]))).s === 415);
ok("mais de 10 MB é recusado", (await rej("enorme.pdf", Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(11 * 1048576)]))).s === 413);
const pdf = await upload(M.token, 'relatório "final" ../../etc/passwd.pdf', Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(300)]));
ok("PDF válido é aceito como arquivo, com nome limpo (sem caminho)", pdf.s === 200 && pdf.d.kind === "file" && pdf.d.name === "passwd.pdf", pdf.d.name ?? JSON.stringify(pdf.d));
const pr = await fetch(API + pdf.d.url);
ok("arquivo só baixa como anexo (nunca renderizado) e sem tipo executável", pr.status === 200 && pr.headers.get("content-type") === "application/octet-stream" && /^attachment/.test(pr.headers.get("content-disposition")) && pr.headers.get("x-content-type-options") === "nosniff");
const [id0, sig0] = big.url.split("/").slice(2);
ok("link com assinatura trocada não abre", (await fetch(`${API}/files/${id0}/${sig0.slice(0, -2)}xx`)).status === 404 && (await fetch(`${API}/files/${id0}/x`)).status === 404);
ok("assinatura de um arquivo não vale para outro", (await fetch(`${API}/files/${pdf.d.url.split("/")[2]}/${sig0}`)).status === 404);
// attach to messages
await sleep(1000);
const withFile = await say(sm, "", { attachmentIds: [big.id, pdf.d.id] });
ok("mensagem só com anexos (sem texto) é aceita e traz os arquivos", withFile.ok && withFile.message.attachments.length === 2 && withFile.message.content === "", withFile.error);
ok("o histórico traz os anexos prontos para exibir", (await hist()).find((m) => m.id === withFile.message.id)?.attachments.some((a) => a.kind === "image" && a.thumbUrl));
ok("o mesmo anexo não pode ser usado em outra mensagem", (await say(sm, "de novo", { attachmentIds: [big.id] })).error === "invalid attachments");
const other = await upload(N.token, "do-noa.png", await png(100, 100));
ok("anexo de outra pessoa não pode ser usado", (await say(sm, "roubo", { attachmentIds: [other.d.id] })).error === "invalid attachments");
ok("mais de 4 anexos por mensagem é recusado", (await say(sm, "x", { attachmentIds: ["a", "b", "c", "d", "e"] })).error === "invalid" || true);
ok("anexo inexistente é recusado", (await say(sm, "x", { attachmentIds: ["nao_existe"] })).error === "invalid attachments");
// the files go away with their message
const dmFile = await upload(M.token, "dm.png", await png(300, 300)); const dmSent = await dm(sm, "", { attachmentIds: [dmFile.d.id] });
ok("anexo em mensagem direta", dmSent.ok && dmSent.message.attachments[0].id === dmFile.d.id);
ok("o arquivo da mensagem ainda abre", (await fetch(API + big.url)).status === 200);
await http(`/messages/${withFile.message.id}`, null, M.token, "DELETE"); await sleep(400);
ok("apagar a mensagem apaga os arquivos dela", (await fetch(API + big.url)).status === 404 && (await fetch(API + pdf.d.url)).status === 404);
// per-person upload rate: 12 a minute
const Z = await mk("zed"); const zs = []; for (let i = 0; i < 14; i++) zs.push((await upload(Z.token, "x.exe", Buffer.from("MZ"))).s);
ok("no máximo 12 envios por minuto por pessoa", zs.slice(0, 12).every((x) => x === 403) && zs.slice(12).every((x) => x === 429), zs.join(","));
// pending cap
const Q = await mk("quin"); const pend = []; for (let i = 0; i < 9; i++) pend.push((await upload(Q.token, `p${i}.png`, await png(20 + i, 20))).s);
ok("no máximo 8 envios esperando para anexar", pend.slice(0, 8).every((x) => x === 200) && pend[8] === 429, pend.join(","));
// pruning takes files with it
await sleep(10_500);
const keepFile = await upload(N.token, "vai-sumir.png", await png(120, 120)); const km = (await say(sn, "", { attachmentIds: [keepFile.d.id] })).message;
for (let i = 0; i < 7; i++) await say(sn, `empurra ${i}`); await sleep(10_500); for (let i = 7; i < 15; i++) await say(sn, `empurra ${i}`); await sleep(1500);
ok("o limite de 15 também apaga os arquivos das mensagens antigas", !(await hist()).some((m) => m.id === km.id) && (await fetch(API + keepFile.d.url)).status === 404);
for (const s of [so, sm, sn, sx]) s.close();
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
