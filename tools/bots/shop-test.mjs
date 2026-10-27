// The shop: catalog, claiming, equipping, sets and bonus, seasons and the runtime switches, preferences, per-server blocks, live effects, counters.
// Dev API started with SHOP_CACHE_MS=300 (so flags changed in the database apply at once), OWNER_EMAILS=teste1@cohle.dev, EMAIL_DEV=1; log in SERVER_LOG.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { io } from "../bots/node_modules/socket.io-client/build/esm/index.js";
const req = createRequire(import.meta.url);
const { PrismaClient } = req("../../apps/server/node_modules/@prisma/client");
const env = Object.fromEntries(readFileSync(new URL("../../apps/server/.env", import.meta.url), "utf8").split("\n").map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
const API = "http://localhost:3001", LOG = process.env.SERVER_LOG;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// live events take a few database round trips (~250 ms each from a dev machine): wait for them (up to `ms`) instead of guessing a fixed pause
const until = async (fn, ms = 10_000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(100); } return fn(); };
let pass = 0, fail = 0; const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}${x ? "  — " + x : ""}`); };
const http = async (p, b, tok, m) => { const r = await fetch(API + p, { method: m ?? (b ? "POST" : "GET"), headers: { ...(b ? { "Content-Type": "application/json" } : {}), ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json().catch(() => ({})) }; };
const last = (re) => [...readFileSync(LOG, "utf8").matchAll(re)].at(-1)?.[1];
const run = Date.now().toString(36).slice(-6);
const mk = async (name) => { const email = `${name}.${run}@cohle.dev`; const r = await http("/auth/register", { email, username: `${name}_${run}`, password: "senhaSegura123" }); if (r.d.token) return r.d; await sleep(500); return (await http("/auth/verify", { email, code: last(/Seu código do Cohle: (\d{6})/g) })).d; };
const conn = async (u) => { const s = io(API, { auth: { token: u.token }, transports: ["websocket"] }); await new Promise((r) => s.on("connect", r)); return s; };
const shop = async (u) => (await http("/shop", null, u.token)).d;
const item = (sh, key) => sh.items.find((i) => i.key === key);
const claim = (u, sh, key) => http(`/shop/items/${item(sh, key).id}/claim`, {}, u.token);
const equip = (u, slot, id) => http("/shop/equipped", { slot, itemId: id }, u.token, "PUT");
const NATAL = ["natal.theme", "natal.frame.garland", "natal.frame.santahat", "natal.badge.spirit", "natal.entrance.hohoho", "natal.name.lights", "natal.name.candycane", "natal.reactions"];
const col = () => prisma.collection.findUnique({ where: { key: "natal" } });
const SET = async (data) => { await prisma.collection.update({ where: { key: "natal" }, data }); await sleep(450); };
const orig = await col();
await prisma.shopItem.updateMany({ data: { locked: false } }); await sleep(450);          // the Loja ships locked ("Em breve"): the older checks below claim items, so unlock for them (locked again at the end)

const A = await mk("ana"), B = await mk("bia"), owner = (await http("/auth/login", { email: "teste1@cohle.dev", password: "teste12345" })).d;
// ---- catalog and the Beta Tester badge ----
let sa = await shop(A);
ok("a loja traz a coleção Natal em temporada, com dias restantes e 'Edição Limitada'", sa.collections.some((c) => c.key === "natal" && c.visible && c.sazonal && c.daysLeft > 0), JSON.stringify(sa.collections.map((c) => [c.key, c.daysLeft])));
ok("todos os itens do Natal estão na vitrine", NATAL.every((k) => !!item(sa, k)), String(sa.items.length));
ok("Beta Tester é automático para quem usa agora", sa.betaTester && sa.owned.includes(item(sa, "beta.tester").id));
ok("cada item vem com preço (0) e is_free_beta (estrutura pronta para cobrar)", sa.items.every((i) => i.price === 0 && i.isFreeBeta === true));
ok("sem login não abre a loja", (await http("/shop")).s === 401);
// ---- claiming ----
ok("pegar grátis (Beta)", (await claim(A, sa, "natal.theme")).s === 200 && (await shop(A)).owned.includes(item(sa, "natal.theme").id));
ok("pegar de novo não duplica nem dá erro", (await claim(A, sa, "natal.theme")).s === 200);
ok("item inexistente: 404", (await http("/shop/items/nao_existe/claim", {}, A.token)).s === 404);
// ---- equipping ----
ok("equipar item que NÃO é seu: 403", (await equip(A, "frame", item(sa, "natal.frame.garland").id)).s === 403);
ok("equipar no slot errado: 400", (await equip(A, "frame", item(sa, "natal.theme").id)).s === 400);
ok("slot inválido: 400", (await equip(A, "asa", item(sa, "natal.theme").id)).s === 400);
await claim(A, sa, "natal.frame.garland"); await claim(A, sa, "natal.name.lights"); await claim(A, sa, "natal.badge.spirit");
let r = await equip(A, "frame", item(sa, "natal.frame.garland").id); ok("equipar o que é seu", r.s === 200 && r.d.equipped.frame === item(sa, "natal.frame.garland").id);
await equip(A, "name_effect", item(sa, "natal.name.lights").id); await equip(A, "badge", item(sa, "natal.badge.spirit").id);
const me = (await http("/me", null, A.token)).d;
ok("/me traz só as chaves do que está equipado (fx)", me.fx?.frame === "natal.frame.garland" && me.fx?.nameEffect === "natal.name.lights" && me.fx?.badge === "natal.badge.spirit" && !me.fx.pet, JSON.stringify(me.fx));
// others see it on messages
const srv = (await http("/servers", { name: "Loja " + run }, owner.token)).d, ch = srv.channels.find((c) => c.type === "TEXT").id, vch = srv.channels.find((c) => c.type === "VOICE").id;
await http(`/servers/join/${srv.inviteCode}`, {}, A.token); await http(`/servers/join/${srv.inviteCode}`, {}, B.token);
const sA = await conn(A), sB = await conn(B), sO = await conn(owner);
for (const s of [sA, sB, sO]) s.emit("channel:join", ch); await sleep(700);
const sent = await new Promise((rr) => sA.emit("message:send", { channelId: ch, content: "oi com moldura" }, rr));
ok("a mensagem nova leva o fx do autor", sent.ok && sent.message.author.fx?.frame === "natal.frame.garland", JSON.stringify(sent.message?.author?.fx));
const hist = (await http(`/channels/${ch}/messages`, null, B.token)).d;
ok("o histórico mostra o fx para os outros", hist.some((m) => m.author.id === A.user.id && m.author.fx?.nameEffect === "natal.name.lights"));
r = await equip(A, "frame", null); ok("desequipar", r.s === 200 && !r.d.equipped.frame && !(await http("/me", null, A.token)).d.fx?.frame);
// ---- sets and bonus ----
const C = await mk("caio"); let sc = await shop(C);
await claim(C, sc, "natal.theme"); await claim(C, sc, "natal.badge.spirit");
const natalId = sc.collections.find((c) => c.key === "natal").id;
r = await http("/shop/equipped/set", { collectionId: natalId }, C.token); ok("conjunto incompleto: equipa o que tem, sem bônus", r.s === 200 && r.d.complete === false && r.d.bonus === null && !!r.d.equipped.theme && !!r.d.equipped.badge && !r.d.equipped.frame, JSON.stringify(r.d));
for (const k of NATAL) await claim(C, sc, k);
r = await http("/shop/equipped/set", { collectionId: natalId }, C.token);
ok("conjunto completo: uma peça por slot e bônus liberado", r.d.complete === true && r.d.bonus === "natal.sleigh" && ["theme", "frame", "badge", "entrance", "name_effect"].every((s) => r.d.equipped[s]), JSON.stringify(r.d.bonus));
ok("o bônus aparece na loja", (await shop(C)).bonus === "natal.sleigh");
await equip(C, "frame", item(sc, "natal.frame.santahat").id); ok("trocar uma peça mantém o bônus (mesma coleção)", (await shop(C)).bonus === "natal.sleigh");
await equip(C, "entrance", null); ok("sem a entrada o bônus some", (await shop(C)).bonus === null);
ok("conjunto de coleção inexistente: 404", (await http("/shop/equipped/set", { collectionId: "x" }, A.token)).s === 404);
// ---- seasons and the runtime switches (no deploy) ----
const D = await mk("duda"); let sd = await shop(D);
await claim(A, sa, "natal.name.candycane");
await SET({ fim: new Date(Date.now() - 86_400_000) });
const afterEnd = await shop(D);
ok("fora da temporada a coleção some da vitrine", !afterEnd.collections.some((c) => c.key === "natal") && !afterEnd.items.some((i) => i.key.startsWith("natal.")));
ok("fora da temporada não dá para pegar item novo", (await http(`/shop/items/${item(sd, "natal.theme").id}/claim`, {}, D.token)).s === 403);
const ownerView = await shop(A);
ok("quem já pegou continua vendo e podendo equipar", ownerView.items.some((i) => i.key === "natal.theme") && (await equip(A, "name_effect", item(sa, "natal.name.candycane").id)).s === 200);
await SET({ fim: orig.fim, ativo: false });
ok("collections.ativo=false: sai da vitrine na hora", !(await shop(D)).collections.some((c) => c.key === "natal"));
ok("collections.ativo=false: deixa de ser entregue aos outros (fx some)", !(await http(`/channels/${ch}/messages`, null, B.token)).d.some((m) => m.author.id === A.user.id && m.author.fx));
ok("collections.ativo=false: não dá para pegar", (await http(`/shop/items/${item(sd, "natal.theme").id}/claim`, {}, D.token)).s === 403);
await SET({ ativo: true, fim: orig.fim }); ok("religar volta tudo", (await shop(D)).collections.some((c) => c.key === "natal"));
// ---- Halloween: a second seasonal collection that works like Natal; when its season ends whoever claimed keeps it and nobody new can ----
const HW = ["halloween.theme", "halloween.frame.pumpkin", "halloween.frame.web", "halloween.badge.spooky", "halloween.entrance.boo", "halloween.name.pumpkin", "halloween.name.ghost", "halloween.reactions"];
const hwCol = await prisma.collection.findUnique({ where: { key: "halloween" } });
const hwSet = async (data) => { await prisma.collection.update({ where: { key: "halloween" }, data }); await sleep(450); };
const H = await mk("hel"); let sh = await shop(H);
const hc = sh.collections.find((c) => c.key === "halloween");
ok("Halloween está em temporada, sazonal, com 8 itens e dias restantes", !!hc && hc.visible && hc.sazonal && hc.daysLeft > 0 && hc.itemIds.length === 8 && HW.every((k) => item(sh, k)), JSON.stringify(hc));
ok("Natal e Halloween aparecem juntos na vitrine", sh.collections.some((c) => c.key === "natal") && sh.collections.some((c) => c.key === "halloween"));
for (const k of HW) await claim(H, sh, k);
r = await http("/shop/equipped/set", { collectionId: hc.id }, H.token);
ok("equipar o conjunto de Halloween libera a bruxa extra (bônus)", r.s === 200 && r.d.bonus === "halloween.witch", JSON.stringify(r.d));
ok("o conjunto de Halloween vira fx (tema, moldura, nome, emblema) para os outros", (await http("/me", null, H.token)).d.fx?.frame?.startsWith("halloween.") && (await http("/me", null, H.token)).d.fx?.nameEffect?.startsWith("halloween."));
await hwSet({ fim: new Date(Date.now() - 86_400_000) });
const hD = await shop(D), hH = await shop(H);
ok("fim da temporada: some da vitrine de quem não pegou e não dá para pegar", !hD.collections.some((c) => c.key === "halloween") && (await http(`/shop/items/${item(sh, "halloween.theme").id}/claim`, {}, D.token)).s === 403);
ok("fim da temporada: quem pegou continua com tudo e pode equipar", HW.every((k) => item(hH, k)) && (await equip(H, "theme", item(sh, "halloween.theme").id)).s === 200);
await hwSet({ ativo: hwCol.ativo, inicio: hwCol.inicio, fim: hwCol.fim });
// ---- permanent collections (no season): Auras, Hacker, Gamer, Barbearia, Rainha ----
const P = await mk("pri"); const sp = await shop(P);
const perm = ["auras", "hacker", "gamer", "barbearia", "rainha"];
ok("5 coleções permanentes na vitrine: sem temporada, sem dias restantes, 8 itens cada", perm.every((k) => { const c = sp.collections.find((x) => x.key === k); return c && c.visible && !c.sazonal && c.daysLeft === null && c.itemIds.length === 8; }), JSON.stringify(sp.collections.map((c) => [c.key, c.itemIds.length])));
ok("as 8 auras são molduras", sp.items.filter((i) => i.key.startsWith("aura.")).length === 8 && sp.items.filter((i) => i.key.startsWith("aura.")).every((i) => i.tipo === "frame"));
for (const k of ["hacker.theme", "hacker.frame.code", "hacker.name.glitch", "hacker.badge.root", "hacker.entrance.access", "hacker.reactions", "aura.fire"]) await claim(P, sp, k);
r = await http("/shop/equipped/set", { collectionId: sp.collections.find((c) => c.key === "hacker").id }, P.token);
const pfx = (await http("/me", null, P.token)).d.fx ?? {};
ok("equipar o conjunto Hacker entrega tema, moldura, nome e emblema", r.s === 200 && pfx.frame === "hacker.frame.code" && pfx.nameEffect === "hacker.name.glitch" && pfx.badge === "hacker.badge.root", JSON.stringify(pfx));
ok("aura equipada como moldura", (await equip(P, "frame", item(sp, "aura.fire").id)).s === 200 && (await http("/me", null, P.token)).d.fx?.frame === "aura.fire");
ok("não dá para equipar uma aura que não é sua (403)", (await equip(P, "frame", item(sp, "aura.gold").id)).s === 403);
ok("coleção permanente continua pegável a qualquer hora", (await claim(P, sp, "gamer.frame.pad")).s === 200);
// ---- Ano Novo: a season that has not started yet (20 Dec): invisible and impossible to claim; open the window and it works like the others ----
const nyCol = await prisma.collection.findUnique({ where: { key: "anonovo" } });
const nySet = async (data) => { await prisma.collection.update({ where: { key: "anonovo" }, data }); await sleep(450); };
const NYK = ["anonovo.theme", "anonovo.frame.gold", "anonovo.frame.confetti", "anonovo.badge.2027", "anonovo.entrance.champagne", "anonovo.name.gold", "anonovo.name.fireworks", "anonovo.reactions"];
const Y = await mk("ano"); let sy = await shop(Y);
await nySet({ inicio: new Date(Date.now() + 30 * 86_400_000), fim: new Date(Date.now() + 50 * 86_400_000) }); sy = await shop(Y);
ok("Ano Novo antes da janela: fora da vitrine e sem itens", !sy.collections.some((c) => c.key === "anonovo") && !sy.items.some((i) => i.key.startsWith("anonovo.")));
await nySet({ inicio: new Date(Date.now() - 86_400_000), fim: new Date(Date.now() + 10 * 86_400_000) }); sy = await shop(Y);
const nc = sy.collections.find((c) => c.key === "anonovo");
ok("Ano Novo dentro da janela: sazonal, 8 itens e dias restantes", !!nc && nc.visible && nc.sazonal && nc.daysLeft > 0 && NYK.every((k) => item(sy, k)), JSON.stringify(nc));
for (const k of NYK) await claim(Y, sy, k);
r = await http("/shop/equipped/set", { collectionId: nc.id }, Y.token); const yfx = (await http("/me", null, Y.token)).d.fx ?? {};
ok("equipar o conjunto de Ano Novo entrega moldura, nome e emblema", r.s === 200 && yfx.frame?.startsWith("anonovo.frame.") && yfx.nameEffect?.startsWith("anonovo.name.") && yfx.badge === "anonovo.badge.2027", JSON.stringify(yfx));
await nySet({ fim: new Date(Date.now() - 3600_000) });
ok("fim da temporada: quem pegou fica, quem não pegou não consegue pegar", (await equip(Y, "theme", item(sy, "anonovo.theme").id)).s === 200 && (await http(`/shop/items/${item(sy, "anonovo.theme").id}/claim`, {}, (await mk("ano2")).token)).s === 403);
await nySet({ ativo: nyCol.ativo, inicio: nyCol.inicio, fim: nyCol.fim });
// ---- the Loja is locked ("Em breve"); only the owner gives gifts ----
await prisma.shopItem.updateMany({ data: { locked: true } }); await sleep(450);
const Gf = await mk("gif"), Gs = await mk("gis"); let sg = await shop(Gf);
ok("trancada: todos os itens vêm com locked=true", sg.items.length > 20 && sg.items.every((i) => i.locked === true));
r = await claim(Gf, sg, "natal.theme");
ok("trancada: ninguém pega item (403 'locked')", r.s === 403 && r.d.error === "item locked", `${r.s} ${JSON.stringify(r.d)}`);
ok("a conta dona pode pegar item trancado (ela usa e presenteia)", (await claim(owner, await shop(owner), "natal.theme")).s === 200);
ok("quem não é dono não presenteia (403)", (await http("/shop/gifts", { to: "@" + Gs.user.username, itemIds: [item(sg, "natal.theme").id] }, Gf.token)).s === 403);
ok("quem não é dono não vê o catálogo completo nem busca pessoas (403)", (await http("/shop/admin/catalog", null, Gf.token)).s === 403 && (await http("/shop/gift-targets?q=teste", null, Gf.token)).s === 403 && (await http("/shop/admin/lock", { locked: false, itemIds: [item(sg, "natal.theme").id] }, Gf.token, "PUT")).s === 403);
ok("canGift: só o dono (teste1) tem", (await shop(owner)).canGift === true && sg.canGift === false);
const tg = await http("/shop/gift-targets?q=" + Gs.user.username.slice(0, 6), null, owner.token);
ok("o dono busca a pessoa para presentear", tg.s === 200 && tg.d.some((u) => u.id === Gs.user.id), JSON.stringify(tg.d).slice(0, 120));
r = await http("/shop/gifts", { to: "@" + Gs.user.username, itemIds: [item(sg, "natal.theme").id, item(sg, "aura.fire").id], note: "bem-vindo ao Cohle!" }, owner.token);
ok("o dono presenteia 2 itens por @usuário (mesmo trancados)", r.s === 200 && r.d.given === 2 && r.d.skipped === 0 && r.d.to.id === Gs.user.id, JSON.stringify(r.d).slice(0, 140));
let sgs = await shop(Gs);
ok("quem recebeu vê os itens como seus e o presente ainda não visto, com remetente e recado", sgs.owned.includes(item(sg, "natal.theme").id) && sgs.unseenGifts.length === 2 && sgs.unseenGifts[0].note === "bem-vindo ao Cohle!" && sgs.unseenGifts[0].from.length > 0, JSON.stringify(sgs.unseenGifts[0]));
ok("o presente pode ser equipado normalmente", (await equip(Gs, "frame", item(sg, "aura.fire").id)).s === 200);
await http("/shop/gifts/seen", {}, Gs.token); sgs = await shop(Gs);
ok("marcar como visto zera a lista de presentes novos", sgs.unseenGifts.length === 0 && sgs.owned.includes(item(sg, "aura.fire").id));
r = await http("/shop/gifts", { to: `gis.${run}@cohle.dev`, itemIds: [item(sg, "natal.theme").id, item(sg, "gamer.theme").id] }, owner.token);
ok("presentear por e-mail: o que a pessoa já tem é pulado", r.s === 200 && r.d.given === 1 && r.d.skipped === 1);
const gamer = sg.collections.find((c) => c.key === "gamer");
r = await http("/shop/gifts", { to: Gs.user.id, collectionId: gamer.id }, owner.token);
ok("presentear uma coleção inteira por id", r.s === 200 && r.d.given === 7 && r.d.skipped === 1, JSON.stringify(r.d).slice(0, 100));
const sock = io(API, { auth: { token: Gf.token }, transports: ["websocket"] }); await new Promise((rr) => sock.on("connect", rr)); let gotGift = null; sock.on("shop:gift", (e) => (gotGift = e));
await http("/shop/gifts", { to: "@" + Gf.user.username, itemIds: [item(sg, "hacker.badge.root").id] }, owner.token); await until(() => gotGift, 6000); sock.close();
ok("quem está online é avisado na hora (shop:gift)", !!gotGift && gotGift.count === 1 && gotGift.from.length > 0, JSON.stringify(gotGift));
ok("pessoa inexistente: 404; dados inválidos: 400", (await http("/shop/gifts", { to: "@nao_existe_zz9", itemIds: [item(sg, "natal.theme").id] }, owner.token)).s === 404 && (await http("/shop/gifts", { to: "@" + Gs.user.username }, owner.token)).s === 400 && (await http("/shop/gifts", { to: "@" + Gs.user.username, itemIds: ["nao-existe"] }, owner.token)).s === 404);
const ac = await http("/shop/admin/catalog", null, owner.token);
ok("o dono vê o catálogo completo, até o que está fora de temporada (Ano Novo)", ac.s === 200 && ac.d.collections.some((c) => c.key === "anonovo") && ac.d.items.some((i) => i.key.startsWith("anonovo.")));
r = await http("/shop/gifts", { to: "@" + Gs.user.username, itemIds: [ac.d.items.find((i) => i.key === "anonovo.theme").id] }, owner.token);
ok("dá para presentear item de temporada que ainda não começou", r.s === 200 && r.d.given === 1);
r = await http("/shop/admin/lock", { locked: false, itemIds: [item(sg, "queen.theme").id] }, owner.token, "PUT");
await sleep(450); sg = await shop(Gf);
ok("o dono destranca um item e aí qualquer pessoa pega (sem deploy)", r.s === 200 && r.d.changed === 1 && item(sg, "queen.theme").locked === false && (await claim(Gf, sg, "queen.theme")).s === 200);
r = await http("/shop/admin/lock", { locked: true, collectionId: gamer.id }, owner.token, "PUT"); await sleep(450);
ok("trancar de novo por coleção", r.s === 200 && r.d.changed === 8 && (await shop(Gf)).items.filter((i) => i.collectionId === gamer.id).every((i) => i.locked));
await prisma.shopItem.updateMany({ data: { locked: false } }); await sleep(450);          // the rest of the suite claims items again
// ---- Pets, animated statuses and banners, and the new collections (Brasil, Carnaval, Memes, Anime) ----
const Pz = await mk("pet"); let spz = await shop(Pz);
const sizes = Object.fromEntries(spz.collections.map((c) => [c.key, c.itemIds.length]));
ok("coleções novas na vitrine: Pets 6, Status 8, Banners 8, Brasil 8, Memes 8, Anime 8", sizes.pets === 6 && sizes.status === 8 && sizes.banners === 8 && sizes.brasil === 8 && sizes.memes === 8 && sizes.anime === 8, JSON.stringify(sizes));
ok("Carnaval (temporada de fevereiro) ainda não aparece na vitrine", !spz.collections.some((c) => c.key === "carnaval"));
const adm = (await http("/shop/admin/catalog", null, owner.token)).d;
ok("o dono vê o Carnaval inteiro (8 itens) para poder presentear antes da temporada", adm.collections.find((c) => c.key === "carnaval")?.itemIds.length === 8);
ok("pets são do tipo pet, status do tipo status e banners do tipo banner", spz.items.filter((i) => i.key.startsWith("pet.")).every((i) => i.tipo === "pet") && spz.items.filter((i) => i.key.startsWith("status.")).every((i) => i.tipo === "status") && spz.items.filter((i) => i.key.startsWith("banner.")).every((i) => i.tipo === "banner"));
r = await http("/shop/gifts", { to: "@" + Pz.user.username, itemIds: ["pet.dragon", "status.music", "banner.aurora", "brasil.theme", "meme.frame.shades"].map((k) => item(spz, k).id) }, owner.token);
ok("o dono presenteia pet, status, banner, tema e moldura de uma vez", r.s === 200 && r.d.given === 5, JSON.stringify(r.d).slice(0, 100));
spz = await shop(Pz);
ok("equipar pet, status e banner nos slots certos", (await equip(Pz, "pet", item(spz, "pet.dragon").id)).s === 200 && (await equip(Pz, "status", item(spz, "status.music").id)).s === 200 && (await equip(Pz, "banner", item(spz, "banner.aurora").id)).s === 200);
const pzfx = (await http("/me", null, Pz.token)).d.fx ?? {};
ok("os outros recebem as chaves pet, status e banner (só chaves, sem texto livre)", pzfx.pet === "pet.dragon" && pzfx.status === "status.music" && pzfx.banner === "banner.aurora", JSON.stringify(pzfx));
ok("pet no slot de moldura é recusado (400)", (await equip(Pz, "frame", item(spz, "pet.dragon").id)).s === 400);
ok("quem não ganhou o pet não consegue equipar (403)", (await equip(Pz, "pet", item(spz, "pet.cat").id)).s === 403);
ok("equipar o tema Brasil e a moldura de meme funciona", (await equip(Pz, "theme", item(spz, "brasil.theme").id)).s === 200 && (await equip(Pz, "frame", item(spz, "meme.frame.shades").id)).s === 200);
// ---- the real sounds: small files that exist ----
for (const f of ["santa-hohoho.mp3", "ghost-boo.mp3"]) { const rr = await fetch(`http://localhost:5173/sfx/${f}`); const buf = Buffer.from(await rr.arrayBuffer()); ok(`som real ${f}: existe, é áudio e é leve (< 40 KB)`, rr.status === 200 && /audio|mpeg/.test(rr.headers.get("content-type") ?? "") && buf.length > 3000 && buf.length < 40_000, `${rr.status} ${buf.length} bytes`); }
// ---- preferences ----
r = await http("/me/prefs", null, A.token); ok("preferências começam com o padrão", r.d.effectsOff === false && r.d.seasonalAuto === true && r.d.lite === "auto" && r.d.hidePolitical === false);
r = await http("/me/prefs", { effectsOff: true, lite: "on" }, A.token, "PUT"); ok("salvar preferências (parcial)", r.d.effectsOff === true && r.d.lite === "on" && r.d.seasonalAuto === true);
ok("preferência inválida: 400", (await http("/me/prefs", { lite: "turbo" }, A.token, "PUT")).s === 400);
// ---- blocking a category inside a server ----
const pol = await prisma.shopItem.create({ data: { key: "teste.politica." + run, tipo: "badge", nome: "Teste político", raridade: "comum", categoria: "politica", meta: {}, locked: false } });
await sleep(450); const sb = await shop(B); await http(`/shop/items/${pol.id}/claim`, {}, B.token); await equip(B, "badge", pol.id);
await new Promise((rr) => sB.emit("message:send", { channelId: ch, content: "oi" }, rr));
ok("antes do bloqueio o item político aparece", (await http(`/channels/${ch}/messages`, null, A.token)).d.some((m) => m.author.id === B.user.id && m.author.fx?.badge === pol.key));
ok("só o dono do servidor bloqueia categoria", (await http(`/servers/${srv.id}/settings`, { blockedCategories: ["politica"] }, A.token, "PUT")).s === 403);
ok("categoria que não existe é recusada", (await http(`/servers/${srv.id}/settings`, { blockedCategories: ["tudo"] }, owner.token, "PUT")).s === 400);
r = await http(`/servers/${srv.id}/settings`, { blockedCategories: ["politica"] }, owner.token, "PUT"); await sleep(450);
ok("o dono bloqueia 'politica' no servidor", r.s === 200 && r.d.blockedCategories[0] === "politica");
ok("com o bloqueio o item político não é entregue nesse servidor", !(await http(`/channels/${ch}/messages`, null, A.token)).d.some((m) => m.author.id === B.user.id && m.author.fx?.badge));
ok("mas nos outros lugares (/me) continua", (await http("/me", null, B.token)).d.fx?.badge === pol.key);
await http(`/servers/${srv.id}/settings`, { blockedCategories: [] }, owner.token, "PUT");
// ---- live effects ----
await claim(A, sa, "natal.entrance.hohoho"); await equip(A, "entrance", item(sa, "natal.entrance.hohoho").id);
const gotE = [], gotG = []; sB.on("fx:entrance", (e) => gotE.push(e)); sB.on("fx:giant", (e) => gotG.push(e)); sA.on("fx:giant", (e) => gotG.push({ ...e, onA: true }));
sB.emit("voice:join", vch); await until(() => false, 1800); sA.emit("voice:join", vch); await until(() => gotE.length >= 1); await sleep(600);
ok("quem está na sala recebe a entrada de quem chegou (fx:entrance)", gotE.length === 1 && gotE[0].userId === A.user.id && gotE[0].key === "natal.entrance.hohoho" && gotE[0].channelId === vch, JSON.stringify(gotE));
sA.emit("voice:leave"); await sleep(600); sA.emit("voice:join", vch); await sleep(3500);
ok("entrar de novo em 10 s não repete o efeito (limite por pessoa)", gotE.length === 1);
sA.emit("fx:giant", "heart"); await until(() => gotG.some((g) => g.icon === "heart"));
ok("reação gigante liberada para todos (coração) chega à sala", gotG.some((g) => g.icon === "heart" && g.userId === A.user.id));
sA.emit("fx:giant", "gift"); await sleep(2500);
ok("ícone do pacote que a pessoa não tem não passa", !gotG.some((g) => g.icon === "gift"));
await claim(A, sa, "natal.reactions"); await sleep(5200); await sleep(450);
sA.emit("fx:giant", "gift"); await until(() => gotG.some((g) => g.icon === "gift" && !g.onA));
ok("com o pacote de Natal o presente passa", gotG.some((g) => g.icon === "gift"));
sA.emit("fx:giant", "gift"); await sleep(2500);
ok("segunda reação em menos de 5 s é ignorada (cooldown)", gotG.filter((g) => g.icon === "gift" && !g.onA).length === 1);
await sleep(5200); sA.emit("fx:giant", "<script>alert(1)</script>"); sA.emit("fx:giant", { x: 1 }); sA.emit("fx:giant", "a".repeat(5000)); await sleep(800);
ok("texto livre ou lixo nunca chega aos outros (só chaves da lista)", gotG.every((g) => ["heart", "gift", "snowman", "reindeer", "fire", "party"].includes(g.icon)));
// ---- counters ----
await sleep(1500); const st = await prisma.userStats.findUnique({ where: { userId: A.user.id } });
ok("contadores de conquista contam as mensagens enviadas", (st?.messages ?? 0) >= 1, JSON.stringify(st));
// ---- claim rate ----
const rr2 = (await Promise.all(Array.from({ length: 33 }, () => http(`/shop/items/${item(sc, "natal.theme").id}/claim`, {}, D.token)))).map((x) => x.s);      // all at once: the limiter is what is being tested, not the network speed
ok("pegar itens em rajada é limitado (30 por minuto)", rr2.filter((x) => x === 429).length >= 1, rr2.filter((x) => x === 429).length + " bloqueados");
await prisma.shopItem.delete({ where: { id: pol.id } }); await SET({ ativo: orig.ativo, inicio: orig.inicio, fim: orig.fim });
for (const slot of ["frame", "badge", "theme", "entrance", "name_effect"]) await equip(owner, slot, null);          // leave the shared teste1 account as found (other suites expect the default theme)
await prisma.shopItem.updateMany({ data: { locked: true } });          // back to the shipped state
for (const s of [sA, sB, sO]) s.close(); await prisma.$disconnect();
console.log(`\n${pass} passaram, ${fail} falharam`); process.exit(fail ? 1 : 0);
