// The shop: catalog seed, own items, equipping, preferences, per-server blocks, and the tiny "fx" each person carries.
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import type { Server as IOServer } from "socket.io";
import { equipSchema, equipSetSchema, giftSchema, lockSchema, prefsSchema, serverSettingsSchema, seasonActive, daysLeft, DEFAULT_PREFS, SLOTS,
  type CollectionDTO, type FxDTO, type GiftDTO, type GiftResultDTO, type GiftTargetDTO, type PrefsDTO, type ShopDTO, type ShopItemDTO, type Slot, type UserDTO } from "@cohle/shared";
import { COLLECTIONS, ITEMS, BASE_GIANT } from "./catalog.js";
import { roleOf } from "../admin.js";

type Deps = {
  prisma: PrismaClient; io: () => IOServer; auth: (req: any, reply: any) => Promise<any>; uid: (req: any) => string;
  isOwner: (userId: string, serverId: string) => Promise<boolean>;
  rate: (userId: string, what: string, max: number, windowMs: number) => boolean;
  /** called when someone's equipped items changed (the server refreshes what the people in their call see) */
  onEquipChanged?: (userId: string) => void;
};
const TTL = Number(process.env.SHOP_CACHE_MS ?? 60_000);          // catalog flags and equipped items are read from memory for up to a minute (tests shorten it)
const BETA_ENDS = new Date(process.env.BETA_ENDS ?? "2027-12-31T00:00:00-03:00");
const SLOT_FX: Record<string, keyof FxDTO> = { frame: "frame", badge: "badge", name_effect: "nameEffect", pet: "pet", status: "status", banner: "banner" };

export async function seedCatalog(prisma: PrismaClient) {
  const ids = new Map<string, string>();
  for (const c of COLLECTIONS) {
    const row = await prisma.collection.upsert({
      where: { key: c.key },
      create: { key: c.key, nome: c.nome, descricao: c.descricao, categoria: c.categoria, sazonal: c.sazonal, inicio: c.inicio ? new Date(c.inicio) : null, fim: c.fim ? new Date(c.fim) : null, bonus: c.bonus ?? null },
      update: { nome: c.nome, descricao: c.descricao, categoria: c.categoria, sazonal: c.sazonal, bonus: c.bonus ?? null },        // ativo / inicio / fim are NOT touched: they are runtime switches
    });
    ids.set(c.key, row.id);
  }
  for (const i of ITEMS) {
    const base = { tipo: i.tipo, nome: i.nome, descricao: i.descricao, raridade: i.raridade, categoria: i.categoria, meta: (i.meta ?? {}) as object, collectionId: i.collection ? ids.get(i.collection) ?? null : null };
    await prisma.shopItem.upsert({ where: { key: i.key }, create: { key: i.key, ...base }, update: base });                       // price / isFreeBeta / ativo are NOT touched
  }
}

export function setupShop(app: FastifyInstance, d: Deps) {
  const { prisma } = d;

  // ---- catalog snapshot (one minute) ----
  let snap: { at: number; items: any[]; collections: any[] } | null = null;
  async function catalog() {
    if (snap && Date.now() - snap.at < TTL) return snap;
    const [items, collections] = await Promise.all([prisma.shopItem.findMany({ orderBy: { key: "asc" } }), prisma.collection.findMany({ orderBy: { key: "asc" } })]);
    snap = { at: Date.now(), items, collections }; return snap;
  }
  const flush = () => { snap = null; };

  const toItem = (i: any): ShopItemDTO => ({ id: i.id, key: i.key, tipo: i.tipo, nome: i.nome, descricao: i.descricao, raridade: i.raridade, categoria: i.categoria, price: i.price, isFreeBeta: i.isFreeBeta, locked: i.locked !== false, collectionId: i.collectionId, meta: (i.meta ?? {}) as Record<string, unknown> });
  const toCollection = (c: any, items: any[], now: Date): CollectionDTO => ({
    id: c.id, key: c.key, nome: c.nome, descricao: c.descricao, categoria: c.categoria, sazonal: c.sazonal, inicio: c.inicio?.toISOString() ?? null, fim: c.fim?.toISOString() ?? null, ativo: c.ativo,
    visible: seasonActive(c, now), daysLeft: daysLeft(c, now), bonus: c.bonus, itemIds: items.filter((i) => i.collectionId === c.id).map((i) => i.id),
  });

  // ---- what each person wears (memory cache) ----
  type Raw = { slot: string; key: string; categoria: string }[];
  const raw = new Map<string, { at: number; v: Raw }>();
  const blocked = new Map<string, { at: number; v: Set<string> }>();
  async function loadRaw(ids: string[]) {
    const need = ids.filter((id) => { const c = raw.get(id); return !c || Date.now() - c.at > TTL; });
    if (!need.length) return;
    const rows = await prisma.userEquipped.findMany({ where: { userId: { in: need } }, select: { userId: true, slot: true, item: { select: { key: true, categoria: true, ativo: true, collection: { select: { ativo: true } } } } } });
    const by = new Map<string, Raw>(need.map((id) => [id, []]));
    for (const r of rows) if (r.item.ativo && (r.item.collection?.ativo ?? true)) by.get(r.userId)!.push({ slot: r.slot, key: r.item.key, categoria: r.item.categoria });      // a switched-off collection disappears for everybody
    for (const [id, v] of by) raw.set(id, { at: Date.now(), v });
  }
  async function loadBlocked(serverId: string) {
    const c = blocked.get(serverId); if (c && Date.now() - c.at < TTL) return;
    const row = await prisma.serverSetting.findUnique({ where: { serverId_key: { serverId, key: "blockedCategories" } } });
    blocked.set(serverId, { at: Date.now(), v: new Set(Array.isArray(row?.value) ? (row!.value as string[]) : []) });
  }
  /** Loads (once a minute) what these people wear and what this server blocks, so `fxOf` can answer without waiting. */
  async function warm(userIds: string[], serverId?: string) { await Promise.all([loadRaw([...new Set(userIds)]), serverId ? loadBlocked(serverId) : Promise.resolve()]); }
  function fxOf(userId: string, serverId?: string): FxDTO | undefined {
    const rows = raw.get(userId)?.v; if (!rows?.length) return undefined;
    const block = serverId ? blocked.get(serverId)?.v : undefined;
    const fx: FxDTO = {};
    for (const r of rows) { const k = SLOT_FX[r.slot]; if (k && !block?.has(r.categoria)) fx[k] = r.key; }
    return Object.keys(fx).length ? fx : undefined;
  }
  /** Adds `fx` to the DTOs (in place). */
  async function decorate(users: UserDTO[], serverId?: string) {
    await warm(users.map((u) => u.id), serverId);
    for (const u of users) { const fx = fxOf(u.id, serverId); if (fx) u.fx = fx; else delete u.fx; }
  }
  const forget = (userId: string) => { raw.delete(userId); };

  // ---- ownership helpers ----
  async function ensureBeta(userId: string) {
    if (Date.now() > BETA_ENDS.getTime()) return false;
    const it = (await catalog()).items.find((i) => i.key === "beta.tester"); if (!it) return false;
    await prisma.userItem.upsert({ where: { userId_itemId: { userId, itemId: it.id } }, create: { userId, itemId: it.id, source: "auto" }, update: {} });
    return true;
  }
  function bonusOf(equippedIds: Partial<Record<Slot, string>>, c: Awaited<ReturnType<typeof catalog>>): string | null {
    const piece = (s: Slot) => c.items.find((i) => i.id === equippedIds[s]);
    const [t, f, e] = [piece("theme"), piece("frame"), piece("entrance")];
    if (!t || !f || !e || !t.collectionId || t.collectionId !== f.collectionId || t.collectionId !== e.collectionId) return null;
    const col = c.collections.find((x) => x.id === t.collectionId);
    return col?.ativo && col.bonus ? col.bonus : null;
  }
  const equippedMap = async (userId: string) => {
    const rows = await prisma.userEquipped.findMany({ where: { userId } });
    return Object.fromEntries(rows.map((r) => [r.slot, r.itemId])) as Partial<Record<Slot, string>>;
  };
  const prefsOf = async (userId: string): Promise<PrefsDTO> => {
    const p = await prisma.userPrefs.findUnique({ where: { userId } });
    return p ? { effectsOff: p.effectsOff, soundsOff: p.soundsOff, seasonalAuto: p.seasonalAuto, hidePolitical: p.hidePolitical, lite: p.lite as PrefsDTO["lite"], serverGroups: Array.isArray(p.serverGroups) ? (p.serverGroups as unknown as PrefsDTO["serverGroups"]) : [] } : { ...DEFAULT_PREFS };
  };

  /** Only the company's master account (confirmed e-mail) can give gifts and unlock items. */
  const isOwnerAccount = async (userId: string) => { const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerifiedAt: true, role: true } }); return !!u && roleOf(u) === "OWNER"; };

  // ---- routes ----
  app.get("/shop", { preHandler: d.auth }, async (req: any): Promise<ShopDTO> => {
    const me = d.uid(req), now = new Date();
    const betaTester = await ensureBeta(me).catch(() => false);
    const [c, owned, equipped, prefs, canGift] = await Promise.all([catalog(), prisma.userItem.findMany({ where: { userId: me }, select: { itemId: true, seen: true, giftedBy: true, giftNote: true } }), equippedMap(me), prefsOf(me), isOwnerAccount(me)]);
    const ownedSet = new Set(owned.map((o) => o.itemId));
    const visibleCols = new Set(c.collections.filter((x) => seasonActive(x, now)).map((x) => x.id));
    // the storefront shows items of collections in season (and loose ones); what you own always stays in your inventory
    const items = c.items.filter((i) => ownedSet.has(i.id) || (i.ativo && (!i.collectionId || visibleCols.has(i.collectionId))));
    const cols = c.collections.filter((x) => visibleCols.has(x.id) || items.some((i) => i.collectionId === x.id && ownedSet.has(i.id)));
    const unseenRows = owned.filter((o) => !o.seen), givers = unseenRows.length ? await prisma.user.findMany({ where: { id: { in: [...new Set(unseenRows.map((o) => o.giftedBy).filter(Boolean) as string[])] } }, select: { id: true, username: true, displayName: true } }) : [];
    const unseenGifts: GiftDTO[] = unseenRows.map((o) => { const g = givers.find((x) => x.id === o.giftedBy); return { itemId: o.itemId, from: g ? (g.displayName || g.username) : "Cohle", note: o.giftNote ?? null }; });
    return { items: items.map(toItem), collections: cols.map((x) => toCollection(x, items, now)), owned: [...ownedSet], equipped, bonus: bonusOf(equipped, c), prefs, now: now.toISOString(), betaTester, canGift, unseenGifts };
  });

  app.post("/shop/items/:id/claim", { preHandler: d.auth }, async (req: any, reply) => {
    const me = d.uid(req), id = String(req.params.id);
    if (!d.rate(me, "claim", 30, 60_000)) return reply.code(429).send({ error: "slow down" });
    const c = await catalog(), it = c.items.find((i) => i.id === id);
    if (!it || !it.ativo) return reply.code(404).send({ error: "not found" });
    if (it.locked !== false && !(await isOwnerAccount(me))) return reply.code(403).send({ error: "item locked" });                  // "Em breve": only the owner account can take it; everybody else gets it as a gift
    const col = c.collections.find((x) => x.id === it.collectionId);
    if (col && !seasonActive(col)) { const has = await prisma.userItem.findUnique({ where: { userId_itemId: { userId: me, itemId: id } } }); if (!has) return reply.code(403).send({ error: "out of season" }); }
    if (!(it.isFreeBeta || it.price === 0)) return reply.code(402).send({ error: "payment required" });         // checkout is not built yet: this is where it will plug in
    await prisma.userItem.upsert({ where: { userId_itemId: { userId: me, itemId: id } }, create: { userId: me, itemId: id, source: "beta" }, update: {} });
    return { ok: true };
  });

  // ---- gifts and locks (owner only) ----
  const targetOf = (u: any): GiftTargetDTO => ({ id: u.id, username: u.username, displayName: u.displayName ?? null, email: u.email });
  app.get("/shop/gift-targets", { preHandler: d.auth }, async (req: any, reply) => {
    const me = d.uid(req); if (!(await isOwnerAccount(me))) return reply.code(403).send({ error: "owner only" });
    if (!d.rate(me, "gift-search", 60, 60_000)) return reply.code(429).send({ error: "slow down" });
    const q = String(req.query?.q ?? "").trim().replace(/^@/, ""); if (q.length < 2) return [];
    const rows = await prisma.user.findMany({ where: { OR: [{ username: { contains: q, mode: "insensitive" } }, { displayName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }, orderBy: { createdAt: "desc" }, take: 8 });
    return rows.map(targetOf);
  });
  /** The whole catalog, whatever the season or lock: the owner picks gifts from here. */
  app.get("/shop/admin/catalog", { preHandler: d.auth }, async (req: any, reply) => {
    const me = d.uid(req); if (!(await isOwnerAccount(me))) return reply.code(403).send({ error: "owner only" });
    const c = await catalog(), now = new Date();
    return { items: c.items.filter((i) => i.ativo).map(toItem), collections: c.collections.map((x: any) => toCollection(x, c.items, now)) };
  });
  app.post("/shop/gifts", { preHandler: d.auth }, async (req: any, reply) => {
    const me = d.uid(req); if (!(await isOwnerAccount(me))) return reply.code(403).send({ error: "owner only" });
    const p = giftSchema.safeParse(req.body); if (!p.success) return reply.code(400).send({ error: "invalid input" });
    if (!d.rate(me, "gift", 60, 60_000)) return reply.code(429).send({ error: "slow down" });
    const to = p.data.to.replace(/^@/, "");
    const target = await prisma.user.findFirst({ where: { OR: [{ id: to }, { username: { equals: to, mode: "insensitive" } }, { email: { equals: to, mode: "insensitive" } }] } });
    if (!target) return reply.code(404).send({ error: "user not found" });
    const c = await catalog();
    const wanted = new Set<string>(p.data.itemIds ?? []);
    if (p.data.collectionId) for (const i of c.items) if (i.collectionId === p.data.collectionId) wanted.add(i.id);
    const items = c.items.filter((i) => i.ativo && wanted.has(i.id));
    if (!items.length) return reply.code(404).send({ error: "no such items" });
    const have = new Set((await prisma.userItem.findMany({ where: { userId: target.id, itemId: { in: items.map((i) => i.id) } }, select: { itemId: true } })).map((o) => o.itemId));
    const fresh = items.filter((i) => !have.has(i.id));
    if (fresh.length) await prisma.userItem.createMany({ data: fresh.map((i) => ({ userId: target.id, itemId: i.id, source: "gift", giftedBy: me, giftNote: p.data.note || null, seen: false })), skipDuplicates: true });
    forget(target.id);
    if (fresh.length) { const from = await prisma.user.findUnique({ where: { id: me }, select: { username: true, displayName: true } }); d.io().to(`user:${target.id}`).emit("shop:gift", { from: from?.displayName || from?.username || "Cohle", count: fresh.length }); }
    const res: GiftResultDTO = { ok: true, given: fresh.length, skipped: items.length - fresh.length, to: targetOf(target) };
    return res;
  });
  app.post("/shop/gifts/seen", { preHandler: d.auth }, async (req: any) => { await prisma.userItem.updateMany({ where: { userId: d.uid(req), seen: false }, data: { seen: true } }); return { ok: true }; });
  /** Unlock ("Em breve" off) or lock again, per item or per collection, without a deploy. */
  app.put("/shop/admin/lock", { preHandler: d.auth }, async (req: any, reply) => {
    const me = d.uid(req); if (!(await isOwnerAccount(me))) return reply.code(403).send({ error: "owner only" });
    const p = lockSchema.safeParse(req.body); if (!p.success) return reply.code(400).send({ error: "invalid input" });
    const r = await prisma.shopItem.updateMany({ where: { OR: [...(p.data.itemIds?.length ? [{ id: { in: p.data.itemIds } }] : []), ...(p.data.collectionId ? [{ collectionId: p.data.collectionId }] : [])] }, data: { locked: p.data.locked } });
    flush(); return { ok: true, changed: r.count };
  });

  const afterEquip = async (me: string, reply?: any) => {
    forget(me); const c = await catalog(); const equipped = await equippedMap(me); const bonus = bonusOf(equipped, c);
    d.io().to(`user:${me}`).emit("shop:equipped", { equipped, bonus });
    d.onEquipChanged?.(me);
    return { equipped, bonus };
  };
  app.put("/shop/equipped", { preHandler: d.auth }, async (req: any, reply) => {
    const me = d.uid(req), p = equipSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid input" });
    if (!d.rate(me, "equip", 40, 60_000)) return reply.code(429).send({ error: "slow down" });
    if (p.data.itemId === null) { await prisma.userEquipped.deleteMany({ where: { userId: me, slot: p.data.slot } }); return afterEquip(me); }
    const it = (await catalog()).items.find((i) => i.id === p.data.itemId);
    if (!it || it.tipo !== p.data.slot) return reply.code(400).send({ error: "wrong slot" });
    if (!(await prisma.userItem.findUnique({ where: { userId_itemId: { userId: me, itemId: it.id } } }))) return reply.code(403).send({ error: "not owned" });     // only what you own, whatever the season
    await prisma.userEquipped.upsert({ where: { userId_slot: { userId: me, slot: p.data.slot } }, create: { userId: me, slot: p.data.slot, itemId: it.id }, update: { itemId: it.id } });
    return afterEquip(me);
  });
  // "Equipar conjunto completo": wears what you own of one collection, one piece per slot
  app.post("/shop/equipped/set", { preHandler: d.auth }, async (req: any, reply) => {
    const me = d.uid(req), p = equipSetSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid input" });
    if (!d.rate(me, "equip", 40, 60_000)) return reply.code(429).send({ error: "slow down" });
    const c = await catalog();
    const mine = new Set((await prisma.userItem.findMany({ where: { userId: me }, select: { itemId: true } })).map((o) => o.itemId));
    const parts = c.items.filter((i) => i.collectionId === p.data.collectionId && mine.has(i.id) && (SLOTS as readonly string[]).includes(i.tipo));
    if (!parts.length) return reply.code(404).send({ error: "nothing owned" });
    const seen = new Set<string>();
    for (const it of parts) { if (seen.has(it.tipo)) continue; seen.add(it.tipo); await prisma.userEquipped.upsert({ where: { userId_slot: { userId: me, slot: it.tipo } }, create: { userId: me, slot: it.tipo, itemId: it.id }, update: { itemId: it.id } }); }
    const total = c.items.filter((i) => i.collectionId === p.data.collectionId && (SLOTS as readonly string[]).includes(i.tipo));
    const slots = new Set(total.map((i) => i.tipo)), have = new Set(parts.map((i) => i.tipo));
    return { ...(await afterEquip(me)), complete: [...slots].every((s) => have.has(s)) };
  });

  app.get("/me/prefs", { preHandler: d.auth }, async (req: any) => prefsOf(d.uid(req)));
  app.put("/me/prefs", { preHandler: d.auth }, async (req: any, reply) => {
    const me = d.uid(req), p = prefsSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid input" });
    await prisma.userPrefs.upsert({ where: { userId: me }, create: { userId: me, ...p.data }, update: p.data });
    return prefsOf(me);
  });

  // the owner of a server can block a category of items inside it (e.g. "politica"): they are not delivered there
  app.put("/servers/:id/settings", { preHandler: d.auth }, async (req: any, reply) => {
    const me = d.uid(req), id = String(req.params.id), p = serverSettingsSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid input" });
    if (!(await d.isOwner(me, id))) return reply.code(403).send({ error: "forbidden" });
    const value = [...new Set(p.data.blockedCategories)];
    await prisma.serverSetting.upsert({ where: { serverId_key: { serverId: id, key: "blockedCategories" } }, create: { serverId: id, key: "blockedCategories", value }, update: { value } });
    blocked.delete(id);
    return { blockedCategories: value };
  });
  app.get("/servers/:id/settings", { preHandler: d.auth }, async (req: any, reply) => {
    const id = String(req.params.id);
    if (!(await prisma.member.findUnique({ where: { userId_serverId: { userId: d.uid(req), serverId: id } } }))) return reply.code(403).send({ error: "forbidden" });
    await loadBlocked(id); return { blockedCategories: [...(blocked.get(id)?.v ?? [])] };
  });

  // ---- live effects (socket.io, nothing is stored) ----
  const giantCache = new Map<string, { at: number; v: Set<string> }>();
  async function giantAllowed(userId: string) {
    const c = giantCache.get(userId); if (c && Date.now() - c.at < TTL) return c.v;
    const rows = await prisma.userItem.findMany({ where: { userId, item: { tipo: "reaction", ativo: true } }, select: { item: { select: { meta: true } } } });
    const v = new Set<string>(BASE_GIANT);
    for (const r of rows) for (const ic of ((r.item.meta as any)?.icons ?? []) as string[]) v.add(ic);
    giantCache.set(userId, { at: Date.now(), v }); return v;
  }
  /** Someone joined a voice room: tell the room which entrance they wear (once per 10 s per person). */
  async function announceEntrance(userId: string, channelId: string, memberIds: string[]) {
    await loadRaw([userId]);                                           // already warm from voice:join (a cache hit); only a cold cache costs a query
    const key = raw.get(userId)?.v.find((r) => r.slot === "entrance")?.key;
    if (!key || !d.rate(userId, "entrance", 1, 10_000)) return;
    for (const id of memberIds) d.io().to(`user:${id}`).emit("fx:entrance", { userId, channelId, key });
  }
  /** A "giant reaction": an icon crossing the screen of everybody in the call. Allow-list + 5 s cooldown. */
  async function giant(userId: string, icon: unknown, channelId: string | undefined, memberIds: string[]) {
    if (typeof icon !== "string" || !channelId) return;
    if (!(await giantAllowed(userId)).has(icon) || !d.rate(userId, "giant", 1, 5_000)) return;
    for (const id of memberIds) d.io().to(`user:${id}`).emit("fx:giant", { userId, channelId, icon });
  }

  // ---- counters for achievements (best effort: never blocks a message) ----
  const bumpStats = (userId: string, p: { messages?: number; voiceMinutes?: number; longestCallMin?: number }) => {
    void prisma.userStats.upsert({ where: { userId }, create: { userId, messages: p.messages ?? 0, voiceMinutes: p.voiceMinutes ?? 0, longestCallMin: p.longestCallMin ?? 0 },
      update: { ...(p.messages ? { messages: { increment: p.messages } } : {}), ...(p.voiceMinutes ? { voiceMinutes: { increment: p.voiceMinutes } } : {}) } }).catch(() => {});
    if (p.longestCallMin) void prisma.userStats.updateMany({ where: { userId, longestCallMin: { lt: p.longestCallMin } }, data: { longestCallMin: p.longestCallMin } }).catch(() => {});
  };

  return { warm, fxOf, decorate, forget, flush, announceEntrance, giant, bumpStats, ensureBeta };
}
