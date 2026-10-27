import "./env.js";
import { randomBytes, randomInt } from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import { Server as IOServer } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { hash, verify } from "@node-rs/argon2";
import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";
import {
  registerSchema, loginSchema, changePasswordSchema, friendRequestSchema, verifySchema, forgotSchema, forgotUsernameSchema, privacySchema, resetSchema, cleanHandle, handleProblem, displayNameReserved, nameOf, noteSchema, type ActivityDTO, type FriendSuggestionDTO, updateProfileSchema, createServerSchema, updateServerSchema, banSchema, muteSchema, updateChannelSchema, createChannelSchema,
  type UsernameCheckDTO, type MessageDTO, type ServerDTO, type UserDTO, type MemberDTO, type BanDTO,
  type DirectMessageDTO, type DmConversationDTO, type ProfileDTO, type AccountDTO, type FriendsDTO, type Relation,
} from "@cohle/shared";
import { emailMode, sendMail, verifyEmail, resetEmail, welcomeEmail, usernameEmail } from "./email.js";
import { issueCode, checkCode } from "./codes.js";
import { registerAdmin, roleOf } from "./admin.js";
import { setupMessaging, rate } from "./messaging.js";
import { setupShop, seedCatalog } from "./shop/shop.js";

const prisma = new PrismaClient();
// Admin API of the LiveKit server (mute / disconnect people at the SFU, not just in the UI).
const rooms = new RoomServiceClient(
  (process.env.LIVEKIT_URL ?? "ws://localhost:7880").replace(/^ws/, "http"),
  process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!,
);
// In production we refuse to start with the development secrets: anyone could forge logins or voice tokens.
if (process.env.NODE_ENV === "production") {
  const weak = (v: string | undefined, bad: string[]) => !v || v.length < 24 || bad.includes(v);
  const problems = [
    weak(process.env.JWT_SECRET, ["dev-secret-change-me", "dev-secret"]) && "JWT_SECRET (>= 24 caracteres, aleatório)",
    weak(process.env.LIVEKIT_API_SECRET, ["devsecret-devsecret-devsecret-devsecret"]) && "LIVEKIT_API_SECRET (>= 24 caracteres, aleatório)",
    (process.env.LIVEKIT_API_KEY ?? "devkey") === "devkey" && "LIVEKIT_API_KEY (diferente de devkey)",
  ].filter(Boolean);
  if (problems.length) { console.error("Configuração insegura para produção. Defina:\n - " + problems.join("\n - ")); process.exit(1); }
}

// TRUST_PROXY=1 when running behind Caddy/nginx so rate limits use the real client IP.
const app = Fastify({ logger: true, trustProxy: process.env.TRUST_PROXY === "1", bodyLimit: 1_500_000 });
await app.register(cors, { origin: true });
await app.register(rateLimit, { global: false });   // enabled per route below
// login/register attempts per minute per IP (AUTH_RATE_MAX only raises it for local test fixtures)
const authLimit = { config: { rateLimit: { max: Number(process.env.AUTH_RATE_MAX ?? 10), timeWindow: "1 minute" } } };
await app.register(jwt, { secret: process.env.JWT_SECRET ?? "dev-secret" });

const auth = async (req: any, reply: any) => {
  try { await req.jwtVerify(); } catch { return reply.code(401).send({ error: "unauthorized" }); }
};
const uid = (req: any): string => req.user.sub;
// Tokens outlive a wiped or deleted account. Writes then hit a user foreign key; that is a dead session.
const accountGone = (err: any) =>
  err?.code === "P2003" && ["Member_userId_fkey", "Message_authorId_fkey", "DirectMessage_senderId_fkey", "Friendship_requesterId_fkey"].includes(String(err?.meta?.constraint));

// Images are never inlined in API payloads: DTOs carry a versioned URL the browser can cache forever.
const toUser = (u: any): UserDTO => ({
  id: u.id, username: u.username, ...(u.displayName ? { displayName: u.displayName } : {}), avatarUrl: u.avatarVersion > 0 ? `/avatars/${u.id}?v=${u.avatarVersion}` : null,
  ...(u.tag ? { tag: u.tag } : {}),
  ...(u.badge === "DEV" ? { badge: "DEV" as const } : {}),
});
// the signed-in person's own DTO also says whether they are an admin (the panel is shown only then; the server re-checks every call)
const toSelf = (u: any): UserDTO => { const r = roleOf(u); return { ...toUser(u), ...(u.bio ? { bio: u.bio } : {}), ...(u.bannerColor ? { bannerColor: u.bannerColor } : {}), ...(r !== "USER" ? { role: r } : {}) }; };
const genTag = () => { const L = "abcdefghjkmnpqrstuvwxyz"; return L[randomInt(L.length)] + L[randomInt(L.length)] + String(randomInt(10, 100)); };   // e.g. "br21"
// accounts created before friend codes existed get theirs now
// only fill codes that are still empty (never overwrite)
prisma.user.findMany({ where: { tag: null }, select: { id: true } }).then(async (l) => { for (const u of l) await prisma.user.updateMany({ where: { id: u.id, tag: null }, data: { tag: genTag() } }).catch(() => {}); }).catch(() => {});
// The "Desenvolvedor" badge belongs to the team's own accounts. It is granted by the server, only to a CONFIRMED e-mail
// listed here (plus DEV_EMAILS, comma separated), so nobody can claim it by typing a name.
const DEV_EMAILS = new Set(["verticeappempresa@gmail.com", ...(process.env.DEV_EMAILS ?? "").split(",")].map((e) => e.trim().toLowerCase()).filter(Boolean));
prisma.user.updateMany({ where: { email: { in: [...DEV_EMAILS] }, emailVerifiedAt: { not: null }, badge: null }, data: { badge: "DEV" } }).catch(() => {});
const withBadge = async (user: any) => {
  if (user.badge !== "DEV" && user.emailVerifiedAt && DEV_EMAILS.has(String(user.email).toLowerCase()))
    return prisma.user.update({ where: { id: user.id }, data: { badge: "DEV" } });
  return user;
};
// Strip heavy/private columns when a user is only embedded in another payload.
const lightUser = { omit: { avatarUrl: true, passwordHash: true, email: true } } as const;
const lightServer = { omit: { iconUrl: true } } as const;
// Starter channels per server template.
const TEMPLATE_CHANNELS: Record<string, { name: string; type: "TEXT" | "VOICE" }[]> = {
  custom: [{ name: "geral", type: "TEXT" }, { name: "Sala de voz", type: "VOICE" }],
  gaming: [{ name: "geral", type: "TEXT" }, { name: "clipes-e-destaques", type: "TEXT" }, { name: "Lobby", type: "VOICE" }, { name: "Sala de jogo", type: "VOICE" }],
  friends: [{ name: "geral", type: "TEXT" }, { name: "memes", type: "TEXT" }, { name: "fotos", type: "TEXT" }, { name: "Bate-papo", type: "VOICE" }, { name: "Sala de filmes", type: "VOICE" }],
  study: [{ name: "geral", type: "TEXT" }, { name: "anotações", type: "TEXT" }, { name: "materiais", type: "TEXT" }, { name: "Sala de estudo 1", type: "VOICE" }, { name: "Sala de estudo 2", type: "VOICE" }],
  community: [{ name: "boas-vindas", type: "TEXT" }, { name: "anúncios", type: "TEXT" }, { name: "geral", type: "TEXT" }, { name: "Sala da comunidade", type: "VOICE" }],
  creators: [{ name: "geral", type: "TEXT" }, { name: "projetos", type: "TEXT" }, { name: "feedback", type: "TEXT" }, { name: "Sala de criação", type: "VOICE" }],
};

const serverInclude = {
  channels: { orderBy: { id: "asc" } },
  members: { where: { role: "OWNER" }, select: { userId: true } },
} as const;
const toServer = (s: any): ServerDTO => ({
  id: s.id, name: s.name, inviteCode: s.inviteCode, iconUrl: s.iconVersion > 0 ? `/server-icons/${s.id}?v=${s.iconVersion}` : null,
  ownerId: s.members?.[0]?.userId ?? "",
  channels: s.channels.map((c: any) => ({ id: c.id, serverId: c.serverId, name: c.name, type: c.type })),
});
const isOwner = async (userId: string, serverId: string) =>
  (await prisma.member.findUnique({ where: { userId_serverId: { userId, serverId } } }))?.role === "OWNER";
const isMember = async (userId: string, serverId: string) =>
  !!(await prisma.member.findUnique({ where: { userId_serverId: { userId, serverId } } }));
const touch = (serverId: string) => io.to(`server:${serverId}`).emit("server:updated", { serverId });

// `boot` identifies this process and `up` is its age in seconds: a changing `boot` means restarts, two values at once mean two copies.
const BOOT = randomBytes(3).toString("hex"), STARTED = Date.now();
app.get("/health", async () => ({ ok: true, name: "cohle", boot: BOOT, up: Math.round((Date.now() - STARTED) / 1000) }));
// Touches the database: point the uptime monitor here so a free Supabase project never idles into a pause.
app.get("/health/db", async () => { await prisma.$queryRaw`SELECT 1`; return { ok: true }; });

// ---- auth ----
const byEmail = (email: string) => prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
// The login / recovery box takes an e-mail OR a @username (an @username never contains "@", so there is no ambiguity).
const byIdentity = (id: string) => (id.includes("@") ? byEmail(id) : prisma.user.findUnique({ where: { username: id } }));
// Staff accounts may take reserved names (@vertice); everybody else may not.
const isStaff = (u: { email: string; emailVerifiedAt: Date | null; role: string }) => roleOf(u) !== "USER";

// Failed sign-ins per account (on top of the per-IP limit): 8 misses in 15 minutes lock that account's login for the rest of the window.
// In memory is enough: one API instance, and a restart only forgives a few tries. Wrong passwords and unknown names count the same,
// and an unknown name still pays for one password check, so neither the answer nor the time says whether the account exists.
const FAIL_MAX = 8, FAIL_WINDOW = 15 * 60_000;
const fails = new Map<string, { n: number; since: number }>();
const locked = (k: string) => { const f = fails.get(k); return !!f && Date.now() - f.since < FAIL_WINDOW && f.n >= FAIL_MAX; };
const noteFail = (k: string) => { const f = fails.get(k); fails.set(k, !f || Date.now() - f.since >= FAIL_WINDOW ? { n: 1, since: Date.now() } : { n: f.n + 1, since: f.since }); };
setInterval(() => { for (const [k, f] of fails) if (Date.now() - f.since >= FAIL_WINDOW) fails.delete(k); }, 10 * 60_000).unref();
const DUMMY_HASH = await hash("cohle-not-a-real-password");
const usernameMailAt = new Map<string, number>();                      // userId -> last "forgot username" mail (60 s apart)
const logAccess = (userId: string, kind: "register" | "login" | "open") => prisma.accessLog.create({ data: { userId, kind } }).catch(() => {});
const session = async (user: any, kind: "register" | "login" = "login") => {
  const u = await withBadge(user); logAccess(u.id, kind); prisma.user.update({ where: { id: u.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  const me = toSelf(u); await shop.decorate([me]);
  return { token: app.jwt.sign({ sub: u.id }), user: me };
};
// Without a mail service configured the address is simply trusted (development, or before the key is set up).
const verifying = emailMode !== "off";
const mailCode = async (user: any, kind: "VERIFY" | "RESET") => {
  const code = await issueCode(prisma, user.id, kind);
  if (!code) return "wait" as const;                                   // asked again too soon
  const m = kind === "VERIFY" ? verifyEmail(user.username, code) : resetEmail(user.username, code);
  await sendMail({ ...m, to: user.email });
  return "sent" as const;
};

app.post("/auth/register", authLimit, async (req, reply) => {
  const p = registerSchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid input" });
  const exists = await prisma.user.findFirst({
    where: { OR: [{ email: { equals: p.data.email, mode: "insensitive" } }, { username: p.data.username }] },   // usernames are stored lowercase, so this is already case-insensitive
  });
  if (exists) return reply.code(409).send({ error: "email or username already in use" });
  if (handleProblem(p.data.username)) return reply.code(400).send({ error: "invalid input" });          // reserved names
  const user = await prisma.user.create({
    data: { email: p.data.email, username: p.data.username, tag: genTag(), passwordHash: await hash(p.data.password), emailVerifiedAt: verifying ? null : new Date() },
  });
  if (!verifying) return await session(user, "register");
  try { await mailCode(user, "VERIFY"); }
  catch (e) {
    app.log.error({ err: String(e) }, "could not send the confirmation e-mail");
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});      // do not leave an account nobody can confirm
    return reply.code(502).send({ error: "email delivery failed" });
  }
  return { needsVerification: true, email: user.email };
});

app.post("/auth/login", authLimit, async (req, reply) => {
  const p = loginSchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid input" });
  const key = p.data.email;
  if (locked(key)) return reply.code(429).send({ error: "too many attempts" });
  const user = await byIdentity(key);
  const good = await verify(user?.passwordHash ?? DUMMY_HASH, p.data.password).catch(() => false);
  if (!user || !good) { noteFail(key); return reply.code(401).send({ error: "invalid credentials" }); }
  fails.delete(key);
  if (verifying && !user.emailVerifiedAt) return reply.code(403).send({ error: "email not verified", needsVerification: true, email: user.email });
  return await session(user);
});

// live check while typing the @username on the sign-up screen
app.get("/auth/username-available", { config: { rateLimit: { max: 40, timeWindow: "1 minute" } } }, async (req: any): Promise<UsernameCheckDTO> => {
  const h = cleanHandle(String(req.query?.u ?? ""));
  const bad = handleProblem(h);
  if (bad) return { available: false, reason: bad };
  return (await prisma.user.findUnique({ where: { username: h }, select: { id: true } })) ? { available: false, reason: "taken" } : { available: true };
});

// "I forgot my @username": we e-mail it to the address on the account. Always answers ok, so it never says which e-mails exist.
app.post("/auth/forgot-username", authLimit, async (req, reply) => {
  const p = forgotUsernameSchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid input" });
  if (!verifying) return reply.code(503).send({ error: "email unavailable" });
  const user = await byEmail(p.data.email);
  if (user && Date.now() - (usernameMailAt.get(user.id) ?? 0) > 60_000) {
    usernameMailAt.set(user.id, Date.now());
    await sendMail({ ...usernameEmail(user.username), to: user.email }).catch((e) => app.log.warn({ err: String(e) }, "username e-mail failed"));
  }
  return { ok: true };
});

// confirm the address with the 6-digit code, then sign in
app.post("/auth/verify", authLimit, async (req, reply) => {
  const p = verifySchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid code" });
  const user = await byIdentity(p.data.email);
  const res = user ? await checkCode(prisma, user.id, "VERIFY", p.data.code) : "wrong";
  if (!user || res !== "ok") return reply.code(res === "expired" ? 410 : res === "locked" ? 429 : 400).send({ error: res === "ok" ? "invalid code" : res });
  const wasNew = !user.emailVerifiedAt;
  const done = await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: user.emailVerifiedAt ?? new Date() } });
  if (wasNew) sendMail({ ...welcomeEmail(done.username), to: done.email }).catch((e) => app.log.warn({ err: String(e) }, "welcome e-mail failed"));
  return await session(done, wasNew ? "register" : "login");
});

// a new confirmation code (always answers ok: it does not reveal which addresses exist)
app.post("/auth/resend", authLimit, async (req) => {
  const p = forgotSchema.safeParse(req.body);
  if (p.success && verifying) {
    const user = await byIdentity(p.data.email);
    if (user && !user.emailVerifiedAt) await mailCode(user, "VERIFY").catch((e) => app.log.warn({ err: String(e) }, "resend failed"));
  }
  return { ok: true };
});

app.post("/auth/forgot", authLimit, async (req, reply) => {
  const p = forgotSchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid input" });
  if (!verifying) return reply.code(503).send({ error: "email unavailable" });
  const user = await byIdentity(p.data.email);
  if (user) await mailCode(user, "RESET").catch((e) => app.log.warn({ err: String(e) }, "reset e-mail failed"));
  return { ok: true };                                                  // same answer whether or not the account exists
});

app.post("/auth/reset", authLimit, async (req, reply) => {
  const p = resetSchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid input" });
  const user = await byIdentity(p.data.email);
  const res = user ? await checkCode(prisma, user.id, "RESET", p.data.code) : "wrong";
  if (!user || res !== "ok") return reply.code(res === "expired" ? 410 : res === "locked" ? 429 : 400).send({ error: res === "ok" ? "invalid code" : res });
  const done = await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hash(p.data.password), emailVerifiedAt: user.emailVerifiedAt ?? new Date() } });
  await prisma.emailCode.deleteMany({ where: { userId: user.id } });
  return await session(done);
});

app.get("/me", { preHandler: auth }, async (req, reply) => {
  const full = await prisma.user.findUnique({ where: { id: uid(req) } });
  if (!full) return reply.code(401).send({ error: "unauthorized" });
  const me = toSelf(await withBadge(full)); await shop.decorate([me]);
  return me;            // people who were already signed in get the badge too
});

// private account details (settings screen)
app.get("/me/account", { preHandler: auth }, async (req, reply) => {
  const u = await prisma.user.findUnique({ where: { id: uid(req) } });
  if (!u) return reply.code(401).send({ error: "unauthorized" });
  const out: AccountDTO = { email: u.email, createdAt: u.createdAt.toISOString(), emailVerified: !!u.emailVerifiedAt, findByEmail: u.allowEmailFind };
  return out;
});

app.post("/me/privacy", { preHandler: auth }, async (req, reply) => {
  const p = privacySchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid input" });
  await prisma.user.update({ where: { id: uid(req) }, data: { allowEmailFind: p.data.findByEmail } });
  return { ok: true };
});

app.post("/me/password", { ...authLimit, preHandler: auth }, async (req, reply) => {
  const p = changePasswordSchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid input" });
  const u = await prisma.user.findUnique({ where: { id: uid(req) } });
  if (!u || !(await verify(u.passwordHash, p.data.current))) return reply.code(401).send({ error: "invalid credentials" });
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await hash(p.data.password) } });
  return { ok: true };
});

// someone's profile card: only people who share a server with you (or yourself)
app.get("/users/:id/profile", { preHandler: auth }, async (req: any, reply) => {
  const me = uid(req), id = String(req.params.id);
  const self = id === me;
  // everything that does not depend on another answer goes out at once: two round trips to the database instead of seven
  const [target, mine, theirs, fr, rels, note] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.member.findMany({ where: { userId: me }, select: { serverId: true } }),
    prisma.member.findMany({ where: { userId: id }, include: { server: { select: { id: true, name: true, iconVersion: true } } } }),
    self ? null : prisma.friendship.findFirst({ where: pairOf(me, id) }),
    self ? [] : prisma.friendship.findMany({ where: { status: "ACCEPTED", OR: [{ requesterId: { in: [me, id] } }, { addresseeId: { in: [me, id] } }] }, select: { requesterId: true, addresseeId: true } }),
    self ? null : prisma.userNote.findUnique({ where: { authorId_targetId: { authorId: me, targetId: id } }, select: { text: true } }),
  ]);
  if (!target) return reply.code(404).send({ error: "not found" });
  const mySet = new Set(mine.map((m) => m.serverId));
  const mutual = theirs.filter((m) => mySet.has(m.serverId));
  if (!self && !mutual.length && !fr) return reply.code(403).send({ error: "forbidden" });
  const relation: Relation = self ? "self" : !fr ? "none" : fr.status === "ACCEPTED" ? "friend" : fr.requesterId === me ? "outgoing" : "incoming";
  // mutual friends: people who are friends with both of us
  const of = (x: string) => new Set(rels.filter((r) => r.requesterId === x || r.addresseeId === x).map((r) => (r.requesterId === x ? r.addresseeId : r.requesterId)));
  const theirsF = of(id), mutualIds = self ? [] : [...of(me)].filter((x) => theirsF.has(x) && x !== me && x !== id);
  // what they are doing right now: only the place is shown, and only when the viewer is in that server too
  let activity: ActivityDTO = { kind: online.has(id) ? "online" : "offline" };
  const chId = voiceOf.get(id), room = chId ? voice.get(chId) : undefined;
  const inCall = !!(chId && room && online.has(id));            // nobody shows as "in a call" once their app is gone, even if the call list has not caught up yet
  if (inCall) activity = { kind: room!.users.get(id)?.sharing ? "sharing" : "voice" };
  const [friendUsers, ch] = await Promise.all([
    mutualIds.length ? prisma.user.findMany({ where: { id: { in: mutualIds.slice(0, 12) } }, ...lightUser }) : [],
    inCall && mySet.has(room!.serverId) ? prisma.channel.findUnique({ where: { id: chId! }, select: { name: true, server: { select: { name: true } } } }) : null,
  ]);
  if (ch) activity.where = `${ch.name} · ${ch.server.name}`;
  const out: ProfileDTO = {
    relation, ...(fr && fr.status === "PENDING" ? { requestId: fr.id } : {}),
    user: toUser(await withBadge(target)), createdAt: target.createdAt.toISOString(), isSelf: self,
    mutual: mutual.map((m) => ({ id: m.server.id, name: m.server.name, iconUrl: m.server.iconVersion > 0 ? `/server-icons/${m.server.id}?v=${m.server.iconVersion}` : null, owner: m.role === "OWNER" })),
    ...(target.bio ? { bio: target.bio } : {}), ...(target.bannerColor ? { bannerColor: target.bannerColor } : {}),
    ...(fr?.status === "ACCEPTED" ? { friendSince: (fr.acceptedAt ?? fr.createdAt).toISOString() } : {}),
    ...(note ? { note: note.text } : {}), activity, mutualFriends: friendUsers.map(toUser), mutualFriendsCount: mutualIds.length,
  };
  await shop.decorate([out.user]);
  return out;
});

app.patch("/me", { preHandler: auth }, async (req, reply) => {
  const p = updateProfileSchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid input" });
  if (p.data.username || p.data.displayName) {
    const cur = await prisma.user.findUnique({ where: { id: uid(req) }, select: { email: true, emailVerifiedAt: true, role: true } });
    if (!cur) return reply.code(401).send({ error: "unauthorized" });
    if (p.data.username) {
      if (handleProblem(p.data.username, isStaff(cur))) return reply.code(400).send({ error: "invalid input" });          // reserved names (staff exempt)
      const taken = await prisma.user.findFirst({ where: { username: p.data.username, NOT: { id: uid(req) } } });
      if (taken) return reply.code(409).send({ error: "username already in use" });
    }
    if (p.data.displayName && !isStaff(cur) && displayNameReserved(p.data.displayName)) return reply.code(400).send({ error: "invalid input" });   // would pass for the team
  }
  const { avatarUrl, displayName, bio, bannerColor, ...rest } = p.data;
  const u = await prisma.user.update({
    where: { id: uid(req) },
    data: {
      ...rest,
      ...(displayName !== undefined ? { displayName: displayName || null } : {}),
      ...(bio !== undefined ? { bio: bio || null } : {}),
      ...(bannerColor !== undefined ? { bannerColor } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl, avatarVersion: avatarUrl ? { increment: 1 } : 0 } : {}),
    },
  });
  const me = toSelf(await withBadge(u)); await shop.decorate([me]);
  return me;            // the full row: the role and the e-mail rules need it (a "light" user would drop the admin entry)
});

// A private note about another person. Same visibility rule as the profile (a shared server or a friendship). Empty text deletes it.
app.put("/users/:id/note", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } }, preHandler: auth }, async (req: any, reply) => {
  const me = uid(req), id = String(req.params.id);
  const p = noteSchema.safeParse(req.body);
  if (!p.success || id === me) return reply.code(400).send({ error: "invalid input" });
  if (!(await prisma.user.findUnique({ where: { id }, select: { id: true } }))) return reply.code(404).send({ error: "not found" });
  const myServers = (await prisma.member.findMany({ where: { userId: me }, select: { serverId: true } })).map((m) => m.serverId);
  const sees = (await prisma.friendship.findFirst({ where: pairOf(me, id), select: { id: true } })) || (await prisma.member.findFirst({ where: { userId: id, serverId: { in: myServers } }, select: { userId: true } }));
  if (!sees) return reply.code(403).send({ error: "forbidden" });
  if (p.data.text) await prisma.userNote.upsert({ where: { authorId_targetId: { authorId: me, targetId: id } }, create: { authorId: me, targetId: id, text: p.data.text }, update: { text: p.data.text } });
  else await prisma.userNote.deleteMany({ where: { authorId: me, targetId: id } });
  return { ok: true };
});

// ---- cached images ----
const DATA_URL = /^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/s;
function sendImage(reply: any, dataUrl: string | null | undefined) {
  const m = dataUrl && DATA_URL.exec(dataUrl);
  if (!m) return reply.code(404).send();
  return reply
    .header("Content-Type", m[1])
    .header("Cache-Control", "public, max-age=31536000, immutable") // URL carries ?v=, so a new upload gets a new URL
    .header("X-Content-Type-Options", "nosniff")
    .header("Content-Security-Policy", "default-src 'none'")
    .header("Cross-Origin-Resource-Policy", "cross-origin")
    .send(Buffer.from(m[2], "base64"));
}
app.get("/avatars/:id", async (req: any, reply) =>
  sendImage(reply, (await prisma.user.findUnique({ where: { id: req.params.id }, select: { avatarUrl: true } }))?.avatarUrl));
app.get("/server-icons/:id", async (req: any, reply) =>
  sendImage(reply, (await prisma.server.findUnique({ where: { id: req.params.id }, select: { iconUrl: true } }))?.iconUrl));

// ---- servers & channels ----
app.get("/servers", { preHandler: auth }, async (req) => {
  const list = await prisma.server.findMany({
    where: { members: { some: { userId: uid(req) } } },
    include: serverInclude, ...lightServer, orderBy: { createdAt: "asc" },
  });
  return list.map(toServer);
});

app.post("/servers", { preHandler: auth }, async (req, reply) => {
  const p = createServerSchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid input" });
  if (!(await prisma.user.findUnique({ where: { id: uid(req) }, select: { id: true } })))
    return reply.code(401).send({ error: "unauthorized" });
  const s = await prisma.server.create({
    data: {
      name: p.data.name, iconUrl: p.data.iconUrl ?? null, iconVersion: p.data.iconUrl ? 1 : 0,
      inviteCode: randomBytes(5).toString("hex"),
      members: { create: { userId: uid(req), role: "OWNER" } },
      channels: { create: TEMPLATE_CHANNELS[p.data.template ?? "custom"] },
    },
    include: serverInclude, ...lightServer,
  });
  return toServer(s);
});

app.post("/servers/join/:code", { preHandler: auth }, async (req: any, reply) => {
  const userId = uid(req);
  const s = await prisma.server.findUnique({ where: { inviteCode: req.params.code }, include: serverInclude, ...lightServer });
  if (!s) return reply.code(404).send({ error: "convite não encontrado" });
  if (!(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })))
    return reply.code(401).send({ error: "unauthorized" });
  if (await prisma.ban.findUnique({ where: { serverId_userId: { serverId: s.id, userId } } }))
    return reply.code(403).send({ error: "você foi banido deste servidor" });
  await prisma.member.upsert({
    where: { userId_serverId: { userId, serverId: s.id } },
    create: { userId, serverId: s.id }, update: {},
  });
  touch(s.id);
  return toServer(s);
});

app.get("/servers/:id/members", { preHandler: auth }, async (req: any, reply) => {
  if (!(await isMember(uid(req), req.params.id))) return reply.code(403).send({ error: "forbidden" });
  const ms = await prisma.member.findMany({ where: { serverId: req.params.id }, include: { user: lightUser } });
  const out: MemberDTO[] = ms
    .map((m) => ({ user: toUser(m.user), role: m.role as "OWNER" | "MEMBER", muted: m.muted }))
    .sort((a, b) => (a.role === b.role ? a.user.username.localeCompare(b.user.username) : a.role === "OWNER" ? -1 : 1));
  return out;
});

app.patch("/servers/:id", { preHandler: auth }, async (req: any, reply) => {
  const p = updateServerSchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid input" });
  if (!(await isOwner(uid(req), req.params.id))) return reply.code(403).send({ error: "só o dono pode fazer isso" });
  const { iconUrl, ...rest } = p.data;
  const s = await prisma.server.update({
    where: { id: req.params.id },
    data: { ...rest, ...(iconUrl !== undefined ? { iconUrl, iconVersion: iconUrl ? { increment: 1 } : 0 } : {}) },
    include: serverInclude, ...lightServer,
  });
  touch(s.id);
  return toServer(s);
});

app.delete("/servers/:id", { preHandler: auth }, async (req: any, reply) => {
  const id: string = req.params.id;
  if (!(await isOwner(uid(req), id))) return reply.code(403).send({ error: "só o dono pode fazer isso" });
  io.to(`server:${id}`).emit("server:deleted", { serverId: id });
  for (const [cid, v] of voice) if (v.serverId === id) { v.users.forEach((_u, u) => voiceOf.delete(u)); voice.delete(cid); }
  for (const c of await prisma.channel.findMany({ where: { serverId: id, type: "VOICE" }, select: { id: true } })) rooms.deleteRoom(c.id).catch(() => {});
  await prisma.server.delete({ where: { id } });
  io.in(`server:${id}`).socketsLeave(`server:${id}`);
  return { ok: true };
});

app.post("/servers/:id/invite/regenerate", { preHandler: auth }, async (req: any, reply) => {
  if (!(await isOwner(uid(req), req.params.id))) return reply.code(403).send({ error: "só o dono pode fazer isso" });
  const s = await prisma.server.update({
    where: { id: req.params.id }, data: { inviteCode: randomBytes(5).toString("hex") }, include: serverInclude, ...lightServer,
  });
  touch(s.id);
  return toServer(s);
});

// Remove someone from the LiveKit room (if they are in a call of this server) and from our presence list.
async function dropFromRoom(userId: string) {
  const channelId = voiceOf.get(userId);
  if (!channelId) return;
  await rooms.removeParticipant(channelId, userId).catch(() => {});
  leaveVoice(userId);
  io.to(`user:${userId}`).emit("voice:disconnected");
}

async function removeMember(serverId: string, userId: string, reason: "leave" | "kick" | "ban") {
  await prisma.member.delete({ where: { userId_serverId: { userId, serverId } } });
  const vc = voiceOf.get(userId);
  if (vc && voice.get(vc)?.serverId === serverId) await dropFromRoom(userId);
  io.to(`user:${userId}`).emit("server:removed", { serverId, reason });
  io.in(`user:${userId}`).socketsLeave(`server:${serverId}`);
  touch(serverId);
}

app.post("/servers/:id/leave", { preHandler: auth }, async (req: any, reply) => {
  const id: string = req.params.id;
  if (!(await isMember(uid(req), id))) return reply.code(404).send({ error: "not found" });
  if (await isOwner(uid(req), id)) return reply.code(400).send({ error: "o dono não pode sair; exclua o servidor" });
  await removeMember(id, uid(req), "leave");
  return { ok: true };
});

app.delete("/servers/:id/members/:userId", { preHandler: auth }, async (req: any, reply) => {
  const { id, userId } = req.params as { id: string; userId: string };
  if (!(await isOwner(uid(req), id))) return reply.code(403).send({ error: "só o dono pode fazer isso" });
  if (userId === uid(req)) return reply.code(400).send({ error: "você não pode se expulsar" });
  if (!(await isMember(userId, id))) return reply.code(404).send({ error: "not found" });
  await removeMember(id, userId, "kick");
  return { ok: true };
});

app.post("/servers/:id/members/:userId/mute", { preHandler: auth }, async (req: any, reply) => {
  const { id, userId } = req.params as { id: string; userId: string };
  const p = muteSchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid input" });
  if (!(await isOwner(uid(req), id))) return reply.code(403).send({ error: "só o dono pode fazer isso" });
  if (userId === uid(req)) return reply.code(400).send({ error: "você não pode se silenciar" });
  if (!(await isMember(userId, id))) return reply.code(404).send({ error: "not found" });
  await prisma.member.update({ where: { userId_serverId: { userId, serverId: id } }, data: { muted: p.data.muted } });
  const channelId = voiceOf.get(userId);
  const v = channelId ? voice.get(channelId) : undefined;
  if (channelId && v && v.serverId === id) {
    // revoke/restore publish rights at the SFU: a muted person cannot just unmute themselves
    await rooms.updateParticipant(channelId, userId, undefined, {
      canSubscribe: true, canPublish: !p.data.muted, canPublishData: true,
    } as any).catch(() => {});
    const u = v.users.get(userId);
    if (u) { v.users.set(userId, { ...u, muted: p.data.muted }); io.to(`server:${id}`).emit("voice:state", voiceDTO(channelId)); }
  }
  touch(id);
  return { ok: true };
});

app.post("/servers/:id/members/:userId/voice-disconnect", { preHandler: auth }, async (req: any, reply) => {
  const { id, userId } = req.params as { id: string; userId: string };
  if (!(await isOwner(uid(req), id))) return reply.code(403).send({ error: "só o dono pode fazer isso" });
  if (userId === uid(req)) return reply.code(400).send({ error: "use o botão de sair da chamada" });
  const vc = voiceOf.get(userId);
  if (!vc || voice.get(vc)?.serverId !== id) return reply.code(404).send({ error: "essa pessoa não está em uma chamada" });
  await dropFromRoom(userId);
  return { ok: true };
});

app.get("/servers/:id/bans", { preHandler: auth }, async (req: any, reply) => {
  if (!(await isOwner(uid(req), req.params.id))) return reply.code(403).send({ error: "só o dono pode fazer isso" });
  const bans = await prisma.ban.findMany({ where: { serverId: req.params.id }, include: { user: lightUser }, orderBy: { createdAt: "desc" } });
  const out: BanDTO[] = bans.map((b) => ({ user: toUser(b.user), createdAt: b.createdAt.toISOString() }));
  return out;
});

app.post("/servers/:id/bans", { preHandler: auth }, async (req: any, reply) => {
  const id: string = req.params.id;
  const p = banSchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid input" });
  if (!(await isOwner(uid(req), id))) return reply.code(403).send({ error: "só o dono pode fazer isso" });
  if (p.data.userId === uid(req)) return reply.code(400).send({ error: "você não pode se banir" });
  if (!(await prisma.user.findUnique({ where: { id: p.data.userId }, select: { id: true } }))) return reply.code(404).send({ error: "not found" });
  await prisma.ban.upsert({
    where: { serverId_userId: { serverId: id, userId: p.data.userId } },
    create: { serverId: id, userId: p.data.userId }, update: {},
  });
  if (await isMember(p.data.userId, id)) await removeMember(id, p.data.userId, "ban");
  return { ok: true };
});

app.delete("/servers/:id/bans/:userId", { preHandler: auth }, async (req: any, reply) => {
  const { id, userId } = req.params as { id: string; userId: string };
  if (!(await isOwner(uid(req), id))) return reply.code(403).send({ error: "só o dono pode fazer isso" });
  await prisma.ban.deleteMany({ where: { serverId: id, userId } });
  return { ok: true };
});

app.post("/servers/:id/channels", { preHandler: auth }, async (req: any, reply) => {
  const p = createChannelSchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid input" });
  if (!(await isOwner(uid(req), req.params.id))) return reply.code(403).send({ error: "só o dono pode criar canais" });
  const c = await prisma.channel.create({ data: { ...p.data, serverId: req.params.id } });
  touch(c.serverId);
  return { id: c.id, serverId: c.serverId, name: c.name, type: c.type };
});

app.patch("/channels/:id", { preHandler: auth }, async (req: any, reply) => {
  const p = updateChannelSchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid input" });
  const ch = await prisma.channel.findUnique({ where: { id: req.params.id } });
  if (!ch || !(await isOwner(uid(req), ch.serverId))) return reply.code(403).send({ error: "só o dono pode fazer isso" });
  const c = await prisma.channel.update({ where: { id: ch.id }, data: { name: p.data.name } });
  touch(c.serverId);
  return { id: c.id, serverId: c.serverId, name: c.name, type: c.type };
});

app.delete("/channels/:id", { preHandler: auth }, async (req: any, reply) => {
  const ch = await prisma.channel.findUnique({ where: { id: req.params.id } });
  if (!ch || !(await isOwner(uid(req), ch.serverId))) return reply.code(403).send({ error: "só o dono pode fazer isso" });
  const v = voice.get(ch.id);
  if (v) { v.users.forEach((_u, u) => voiceOf.delete(u)); voice.delete(ch.id); }
  rooms.deleteRoom(ch.id).catch(() => {});
  await prisma.channel.delete({ where: { id: ch.id } });
  touch(ch.serverId);
  return { ok: true };
});

// ---- messages ----
// The channel, if this person is a member of its server. One round trip (the two lookups do not depend on each other): this runs on every message sent.
async function memberOfChannel(userId: string, channelId: string) {
  const [ch, m] = await Promise.all([
    prisma.channel.findUnique({ where: { id: channelId } }),
    prisma.member.findFirst({ where: { userId, server: { channels: { some: { id: channelId } } } }, select: { userId: true } }),
  ]);
  return ch && m ? ch : null;
}

// ---- direct messages (1:1, with history) ----
/** people may start a conversation only when they share a server (or already talked): no cold messages to strangers */
async function canDm(a: string, b: string) {
  if (a === b) return false;
  if (await prisma.friendship.findFirst({ where: { status: "ACCEPTED", OR: [{ requesterId: a, addresseeId: b }, { requesterId: b, addresseeId: a }] }, select: { id: true } })) return true;
  const mine = await prisma.member.findMany({ where: { userId: a }, select: { serverId: true } });
  if (mine.length && await prisma.member.findFirst({ where: { userId: b, serverId: { in: mine.map((m) => m.serverId) } }, select: { userId: true } })) return true;
  return !!(await prisma.directMessage.findFirst({ where: { OR: [{ senderId: a, recipientId: b }, { senderId: b, recipientId: a }] }, select: { id: true } }));
}
const unreadFrom = async (me: string, peer: string) => {
  const r = await prisma.dmRead.findUnique({ where: { userId_peerId: { userId: me, peerId: peer } } });
  return prisma.directMessage.count({ where: { senderId: peer, recipientId: me, ...(r ? { createdAt: { gt: r.readAt } } : {}) } });
};

// messages, replies, reactions, files and the 15-message history live in messaging.ts
// the visual-items shop (catalog, equipping, live effects) lives in shop/shop.ts
const shop = setupShop(app, { prisma, io: () => io, auth, uid, isOwner, rate,
  onEquipChanged: (id) => { const ch = voiceOf.get(id), v = ch ? voice.get(ch) : undefined; if (ch && v) void shop.warm([id], v.serverId).then(() => io.to(`server:${v.serverId}`).emit("voice:state", voiceDTO(ch))); } });
const messaging = setupMessaging(app, { prisma, io: () => io, auth, uid, toUser, lightUser, memberOfChannel, isOwner, canDm, decorate: shop.decorate, onMessage: (u) => shop.bumpStats(u, { messages: 1 }) });
const { toDm } = messaging;

// conversations I have, newest first, with the unread count
app.get("/dms", { preHandler: auth }, async (req: any) => {
  const me = uid(req);
  const recent = await prisma.directMessage.findMany({ where: { OR: [{ senderId: me }, { recipientId: me }] }, include: messaging.withRels, orderBy: { createdAt: "desc" }, take: 400 });
  const lastBy = new Map<string, any>();
  for (const m of recent) { const peer = m.senderId === me ? m.recipientId : m.senderId; if (!lastBy.has(peer)) lastBy.set(peer, m); }
  const peers = [...lastBy.keys()].slice(0, 50);
  const users = await prisma.user.findMany({ where: { id: { in: peers } }, ...lightUser });
  const out: DmConversationDTO[] = await Promise.all(peers.map(async (id) => ({
    peer: toUser(users.find((u) => u.id === id)!), last: toDm(lastBy.get(id)), unread: await unreadFrom(me, id),
  })));
  return out.filter((c) => c.peer.id);
});

// people I can message (members of my servers)
app.get("/dms/people", { preHandler: auth }, async (req: any) => {
  const me = uid(req);
  const mine = await prisma.member.findMany({ where: { userId: me }, select: { serverId: true } });
  const ms = await prisma.member.findMany({ where: { serverId: { in: mine.map((m) => m.serverId) }, userId: { not: me } }, include: { user: lightUser } });
  const seen = new Map<string, UserDTO>(); ms.forEach((m) => seen.set(m.userId, toUser(m.user)));
  return [...seen.values()].sort((a, b) => a.username.localeCompare(b.username));
});

app.post("/dms/:peerId/read", { preHandler: auth }, async (req: any) => {
  const me = uid(req), peer = String(req.params.peerId);
  await prisma.dmRead.upsert({ where: { userId_peerId: { userId: me, peerId: peer } }, update: { readAt: new Date() }, create: { userId: me, peerId: peer } });
  io.to(`user:${me}`).emit("dm:read", { peerId: peer });                        // other windows/devices clear their badge too
  return { ok: true };
});

// ---- friends: add by @name#code, requests, online/offline list ----
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE = /^@?\s*([A-Za-z0-9_.]{3,20})(?:\s*#\s*[A-Za-z0-9]{2,8})?$/;     // "@user", "user", or the old "@user #code" (the code is no longer needed: handles are unique)
const ping = (...ids: string[]) => ids.forEach((i) => io.to(`user:${i}`).emit("friends:update"));
const pairOf = (a: string, b: string) => ({ OR: [{ requesterId: a, addresseeId: b }, { requesterId: b, addresseeId: a }] });

app.get("/friends", { preHandler: auth }, async (req: any) => {
  const me = uid(req);
  const rows = await prisma.friendship.findMany({ where: { OR: [{ requesterId: me }, { addresseeId: me }] }, include: { requester: true, addressee: true }, orderBy: { createdAt: "desc" } });
  const out: FriendsDTO = { friends: [], incoming: [], outgoing: [] };
  for (const r of rows) {
    const other = r.requesterId === me ? r.addressee : r.requester;
    if (r.status === "ACCEPTED") out.friends.push({ user: toUser(other), since: (r.acceptedAt ?? r.createdAt).toISOString(), online: online.has(other.id) });
    else (r.requesterId === me ? out.outgoing : out.incoming).push({ id: r.id, user: toUser(other), createdAt: r.createdAt.toISOString() });
  }
  out.friends.sort((a, b) => Number(b.online) - Number(a.online) || a.user.username.localeCompare(b.user.username));
  return out;
});

// One request between two people: sends it, or accepts it when they had already asked me. Returns what happened, or why not.
async function befriend(me: string, target: { id: string }): Promise<"sent" | "accepted" | "already friends" | "already requested"> {
  const ex = await prisma.friendship.findFirst({ where: pairOf(me, target.id) });
  if (ex?.status === "ACCEPTED") return "already friends";
  if (ex && ex.requesterId === me) return "already requested";
  if (ex) { await prisma.friendship.update({ where: { id: ex.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } }); ping(me, target.id); return "accepted"; }   // they had asked me first
  await prisma.friendship.create({ data: { requesterId: me, addresseeId: target.id } });
  ping(me, target.id); return "sent";
}

app.post("/friends/request", { ...authLimit, preHandler: auth }, async (req: any, reply) => {
  const p = friendRequestSchema.safeParse(req.body); const me = uid(req);
  if (!p.success) return reply.code(400).send({ error: "bad handle" });
  const raw = p.data.handle.trim();
  // By e-mail: the answer is the same whether or not the address has an account (or lets itself be found), so this cannot be used
  // to check which e-mails are registered. Only confirmed accounts that left "find me by e-mail" on can receive the request.
  if (!raw.startsWith("@") && EMAIL_RE.test(raw)) {
    const t = await byEmail(raw.toLowerCase());
    if (t && t.id !== me && t.emailVerifiedAt && t.allowEmailFind) await befriend(me, t);
    return { status: "sent", user: null };
  }
  const m = HANDLE.exec(raw);
  if (!m) return reply.code(400).send({ error: "bad handle" });
  const target = await prisma.user.findUnique({ where: { username: m[1].toLowerCase() } });          // @usernames are public: a clear "not found" is fine
  if (!target) return reply.code(404).send({ error: "user not found" });
  if (target.id === me) return reply.code(400).send({ error: "self" });
  const r = await befriend(me, target);
  if (r === "already friends" || r === "already requested") return reply.code(409).send({ error: r });
  return { status: r, user: toUser(target) };
});

// People who share a server with me and are not yet friends (nor pending): the most shared servers first. Only what a server member can already see.
app.get("/friends/suggestions", { preHandler: auth }, async (req: any): Promise<FriendSuggestionDTO[]> => {
  const me = uid(req);
  const mine = await prisma.member.findMany({ where: { userId: me }, select: { serverId: true, server: { select: { name: true } } } });
  if (!mine.length) return [];
  const names = new Map(mine.map((m) => [m.serverId, m.server.name]));
  const [others, related] = await Promise.all([
    prisma.member.findMany({ where: { serverId: { in: [...names.keys()] }, userId: { not: me } }, select: { userId: true, serverId: true }, take: 2000 }),
    prisma.friendship.findMany({ where: { OR: [{ requesterId: me }, { addresseeId: me }] }, select: { requesterId: true, addresseeId: true } }),
  ]);
  const skip = new Set(related.flatMap((r) => [r.requesterId, r.addresseeId]));
  const shared = new Map<string, string[]>();
  for (const o of others) if (!skip.has(o.userId)) { const l = shared.get(o.userId) ?? []; l.push(names.get(o.serverId)!); shared.set(o.userId, l); }
  const ids = [...shared.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 20).map(([id]) => id);
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, ...lightUser });
  return ids.flatMap((id) => { const u = users.find((x) => x.id === id); return u ? [{ user: toUser(u), shared: shared.get(id)!.slice(0, 3), count: shared.get(id)!.length }] : []; });
});

app.post("/friends/:id/accept", { preHandler: auth }, async (req: any, reply) => {
  const f = await prisma.friendship.findUnique({ where: { id: String(req.params.id) } });
  if (!f || f.addresseeId !== uid(req) || f.status !== "PENDING") return reply.code(404).send({ error: "not found" });
  await prisma.friendship.update({ where: { id: f.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } }); ping(f.requesterId, f.addresseeId); return { ok: true };
});
// decline an incoming request, or cancel one I sent
app.post("/friends/:id/decline", { preHandler: auth }, async (req: any, reply) => {
  const f = await prisma.friendship.findUnique({ where: { id: String(req.params.id) } });
  const me = uid(req);
  if (!f || f.status !== "PENDING" || (f.addresseeId !== me && f.requesterId !== me)) return reply.code(404).send({ error: "not found" });
  await prisma.friendship.delete({ where: { id: f.id } }); ping(f.requesterId, f.addresseeId); return { ok: true };
});
app.delete("/friends/:userId", { preHandler: auth }, async (req: any) => {
  const me = uid(req), other = String(req.params.userId);
  await prisma.friendship.deleteMany({ where: { status: "ACCEPTED", ...pairOf(me, other) } }); ping(me, other); return { ok: true };
});

// ---- voice (LiveKit token) ----
app.post("/channels/:id/voice-token", { preHandler: auth }, async (req: any, reply) => {
  const ch = await memberOfChannel(uid(req), req.params.id);
  if (!ch || ch.type !== "VOICE") return reply.code(403).send({ error: "forbidden" });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: uid(req) }, ...lightUser });
  const member = await prisma.member.findUnique({ where: { userId_serverId: { userId: user.id, serverId: ch.serverId } } });
  const at = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, {
    identity: user.id, name: nameOf(user),
  });
  at.addGrant({ roomJoin: true, room: ch.id, canPublish: !member?.muted, canSubscribe: true });
  return { token: await at.toJwt(), url: process.env.LIVEKIT_URL };
});

// ---- realtime ----
const io = new IOServer(app.server, { cors: { origin: true } });
const online = new Map<string, number>();
// channelId -> { serverId, users by id }
const voice = new Map<string, { serverId: string; users: Map<string, UserDTO> }>();
const voiceOf = new Map<string, string>(); // userId -> channelId
registerAdmin(app, { prisma, auth, uid, live: () => ({ online: online.size, voice: voiceOf.size, rooms: voice.size }), isOnline: (id) => online.has(id) });
const voiceDTO = (channelId: string) => { const v = voice.get(channelId); return { channelId, users: [...(v?.users.values() ?? [])].map((u) => { const fx = shop.fxOf(u.id, v!.serverId); return fx ? { ...u, fx } : u; }) }; };

const joinedAt = new Map<string, number>();   // userId -> when we last heard "voice:join" (grace while the app is still connecting to LiveKit)
const SOUND_IDS = new Set(["scare", "fireworks", "laugh", "call", "tatakae"]);
const soundAt = new Map<string, number>();
const sharingAt = new Map<string, number>();  // userId -> last time the app told us it started/stopped sharing
const absent = new Map<string, number>();     // userId -> consecutive checks in which LiveKit did not list them

const callSince = new Map<string, number>();    // userId -> when this call started (achievement counters)
function leaveVoice(userId: string) {
  absent.delete(userId);
  const since = callSince.get(userId); callSince.delete(userId);
  if (since) { const min = Math.round((Date.now() - since) / 60_000); if (min > 0) shop.bumpStats(userId, { voiceMinutes: min, longestCallMin: min }); }
  const channelId = voiceOf.get(userId);
  if (!channelId) return;
  voiceOf.delete(userId);
  const v = voice.get(channelId);
  if (!v) return;
  v.users.delete(userId);
  io.to(`server:${v.serverId}`).emit("voice:state", voiceDTO(channelId));
  if (v.users.size === 0) voice.delete(channelId);
}

// ---- LiveKit is the source of truth for "who is in which voice room" ----
// The in-memory list above is fed by app messages, which are lost when the server restarts/sleeps or a socket blips.
// Every few seconds we ask LiveKit who is really in each room and fix the list: add who is missing, drop who is gone.
let reconciling = false;
async function reconcileVoice(forceUser?: string) {
  if (reconciling) return;
  reconciling = true;
  try {
    const live = new Map<string, Map<string, { name: string; sharing: boolean; joined: number }>>();   // channelId -> userId -> info
    const lkRooms = await rooms.listRooms();
    await Promise.all(lkRooms.map(async (r) => {
      const ps = await rooms.listParticipants(r.name).catch(() => []);
      live.set(r.name, new Map(ps.map((p) => [p.identity, { name: p.name, sharing: p.tracks.some((t) => t.source === TrackSource.SCREEN_SHARE), joined: Number(p.joinedAt) }])));
    }));

    const changed = new Set<string>();
    const now = Date.now();

    // 1) who LiveKit has but we do not (or have in another channel)
    const channelIds = [...live.keys()].filter((c) => live.get(c)!.size);
    const known = channelIds.length ? await prisma.channel.findMany({ where: { id: { in: channelIds }, type: "VOICE" }, select: { id: true, serverId: true } }) : [];
    const serverOf = new Map(known.map((c) => [c.id, c.serverId]));
    // A person can be connected to two rooms at once (two devices, a leftover session). Our list holds ONE room per person, so be stable:
    // keep the room they are already listed in as long as LiveKit still has them there; otherwise pick the one they joined last.
    const byUser = new Map<string, { channelId: string; joined: number }[]>();
    for (const [channelId, people] of live) if (serverOf.has(channelId)) for (const [userId, info] of people) byUser.set(userId, [...(byUser.get(userId) ?? []), { channelId, joined: info.joined }]);
    const missing: { channelId: string; userId: string }[] = [];
    for (const [userId, where] of byUser) {
      const current = voiceOf.get(userId);
      if (current && where.some((w) => w.channelId === current)) continue;
      missing.push({ channelId: where.sort((a, b) => b.joined - a.joined)[0].channelId, userId });
    }
    if (missing.length) {
      const users = await prisma.user.findMany({ where: { id: { in: missing.map((m) => m.userId) } }, ...lightUser });
      const members = await prisma.member.findMany({ where: { OR: missing.map((m) => ({ userId: m.userId, serverId: serverOf.get(m.channelId)! })) } });
      for (const m of missing) {
        const u = users.find((x) => x.id === m.userId); const sid = serverOf.get(m.channelId)!;
        const mem = members.find((x) => x.userId === m.userId && x.serverId === sid);
        if (!u || !mem) continue;                                     // not a member of that server: never show them
        const prev = voiceOf.get(m.userId);
        if (prev && prev !== m.channelId) { leaveVoice(m.userId); }
        let v = voice.get(m.channelId); if (!v) { v = { serverId: sid, users: new Map() }; voice.set(m.channelId, v); }
        v.users.set(m.userId, { ...toUser(u), sharing: live.get(m.channelId)!.get(m.userId)!.sharing, muted: mem.muted });
        voiceOf.set(m.userId, m.channelId); absent.delete(m.userId); changed.add(m.channelId);
      }
    }

    // 2) who we list but LiveKit does not have (after a short grace, and only if it repeats)
    for (const [channelId, v] of [...voice]) {
      for (const [userId, u] of [...v.users]) {
        const info = live.get(channelId)?.get(userId);
        if (info) {
          absent.delete(userId);
          if (u.sharing !== info.sharing && now - (sharingAt.get(userId) ?? 0) > 10_000) { v.users.set(userId, { ...u, sharing: info.sharing }); changed.add(channelId); }
          continue;
        }
        const grace = userId === forceUser ? 0 : 20_000;                  // right after "voice:join" the app is still connecting to LiveKit
        if (now - (joinedAt.get(userId) ?? 0) < grace) continue;
        const n = (absent.get(userId) ?? 0) + 1; absent.set(userId, n);
        if (n >= (userId === forceUser ? 1 : 2)) { leaveVoice(userId); }
      }
    }
    for (const channelId of changed) { const v = voice.get(channelId); if (v) io.to(`server:${v.serverId}`).emit("voice:state", voiceDTO(channelId)); }
  } catch { /* LiveKit unreachable for a moment: keep what we have */ }
  finally { reconciling = false; }
}
setInterval(() => { if (io.engine.clientsCount > 0) void reconcileVoice(); }, 5000).unref();

io.use((socket, next) => {
  try {
    const payload: any = app.jwt.verify(String(socket.handshake.auth.token));
    socket.data.userId = payload.sub;
    next();
  } catch { next(new Error("unauthorized")); }
});

io.on("connection", (socket) => {
  const userId: string = socket.data.userId;
  socket.join(`user:${userId}`);
  online.set(userId, (online.get(userId) ?? 0) + 1);
  // "last seen" and one "open" access per 30 minutes (a reconnect is not a new visit)
  prisma.user.findUnique({ where: { id: userId }, select: { lastSeenAt: true } }).then(async (u) => {
    if (!u) return;
    if (!u.lastSeenAt || Date.now() - u.lastSeenAt.getTime() > 30 * 60_000) logAccess(userId, "open");
    await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } });
  }).catch(() => {});
  io.emit("presence", { userId, online: true });
  socket.emit("presence:snapshot", [...online.keys()]);

  // The app emits events (voice:join, channel:join...) the very instant it connects, so every handler below is registered
  // RIGHT NOW. Only the database lookup of this user's servers is asynchronous; handlers that need it wait for `ready`.
  const serverIds = new Set<string>();
  const ready = (async () => {
    const memberships = await prisma.member.findMany({ where: { userId }, select: { serverId: true } });
    memberships.forEach((m) => { serverIds.add(m.serverId); socket.join(`server:${m.serverId}`); });
    socket.emit("voice:snapshot", [...voice.entries()].filter(([, v]) => serverIds.has(v.serverId)).map(([id]) => voiceDTO(id)));
  })().catch(() => {});

  socket.on("channel:join", async (channelId: string) => {
    await ready;
    if (await memberOfChannel(userId, channelId)) socket.join(channelId);
  });
  socket.on("message:send", async (data: any, ack?: Function) => { ack?.(await messaging.sendChannel(userId, data).catch(() => ({ error: "failed" }))); });
  socket.on("dm:send", async (data: any, ack?: Function) => { ack?.(await messaging.sendDirect(userId, data).catch(() => ({ error: "failed" }))); });
  // soundboard: a short sound for everybody in my call (allow-list, 2.5 s cooldown, owner-muted people can't)
  socket.on("voice:sound", (id: string) => {
    if (!SOUND_IDS.has(id)) return;
    const channelId = voiceOf.get(userId); const v = channelId ? voice.get(channelId) : undefined; const me = v?.users.get(userId);
    if (!channelId || !v || !me || me.muted) return;
    const now = Date.now(); if (now - (soundAt.get(userId) ?? 0) < 2500) return;
    soundAt.set(userId, now);
    for (const uid2 of v.users.keys()) io.to(`user:${uid2}`).emit("voice:sound", { id, name: nameOf(me), channelId });
  });
  socket.on("dm:typing", (toId: string) => { if (typeof toId === "string") io.to(`user:${toId}`).emit("dm:typing", { fromId: userId }); });
  socket.on("server:join", async (serverId: string) => {
    const m = await prisma.member.findUnique({ where: { userId_serverId: { userId, serverId } } });
    if (m) { serverIds.add(serverId); socket.join(`server:${serverId}`); }
  });
  // the app asks for the current voice rooms again (window focus / periodic): heals any push it may have missed
  socket.on("voice:sync", async () => {
    await ready;
    socket.emit("voice:snapshot", [...voice.entries()].filter(([, v]) => serverIds.has(v.serverId)).map(([id]) => voiceDTO(id)));
  });
  socket.on("voice:join", async (channelId: string) => {
    await ready;
    const ch = await memberOfChannel(userId, channelId);
    if (!ch || ch.type !== "VOICE") return;
    if (voiceOf.get(userId) && voiceOf.get(userId) !== channelId) leaveVoice(userId);
    let v = voice.get(channelId);
    if (!v) { v = { serverId: ch.serverId, users: new Map() }; voice.set(channelId, v); }
    // everything this needs from the database, in one round trip: who they are, their member row, and what the people already here (and they) wear
    const [user, member] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, ...lightUser }),
      prisma.member.findUnique({ where: { userId_serverId: { userId, serverId: ch.serverId } } }),
      shop.warm([...v.users.keys(), userId], ch.serverId).catch(() => {}),
    ]);
    if (!user) return;
    v.users.set(userId, { ...toUser(user), sharing: !!socket.data.sharing, muted: !!member?.muted, micOff: !!socket.data.micOff, deaf: !!socket.data.deaf });
    voiceOf.set(userId, channelId);
    joinedAt.set(userId, Date.now()); absent.delete(userId);
    socket.data.voice = true;
    if (!callSince.has(userId)) callSince.set(userId, Date.now());
    io.to(`server:${ch.serverId}`).emit("voice:state", voiceDTO(channelId));
    void shop.announceEntrance(userId, channelId, [...v.users.keys()]).catch(() => {});
  });
  // a "giant reaction" for everybody in my call
  socket.on("fx:giant", (icon: unknown) => { const ch = voiceOf.get(userId), v = ch ? voice.get(ch) : undefined; if (v) void shop.giant(userId, icon, ch, [...v.users.keys()]).catch(() => {}); });
  socket.on("voice:leave", () => { socket.data.sharing = false; socket.data.micOff = false; socket.data.deaf = false; leaveVoice(userId); });
  socket.on("voice:sharing", (on: boolean) => {
    socket.data.sharing = !!on;   // remembered even if voice:join is still being processed (reconnect race)
    sharingAt.set(userId, Date.now());
    const channelId = voiceOf.get(userId);
    const v = channelId ? voice.get(channelId) : undefined;
    const u = v?.users.get(userId);
    if (!channelId || !v || !u) return;
    v.users.set(userId, { ...u, sharing: !!on });
    io.to(`server:${v.serverId}`).emit("voice:state", voiceDTO(channelId));
  });
  // mic/deafen state, told by the app the moment it changes (shown next to the name for everyone)
  socket.on("voice:media", (m: { micOff?: boolean; deaf?: boolean }) => {
    socket.data.micOff = !!m?.micOff; socket.data.deaf = !!m?.deaf;
    const channelId = voiceOf.get(userId);
    const v = channelId ? voice.get(channelId) : undefined;
    const u = v?.users.get(userId);
    if (!channelId || !v || !u || (u.micOff === socket.data.micOff && u.deaf === socket.data.deaf)) return;
    v.users.set(userId, { ...u, micOff: socket.data.micOff, deaf: socket.data.deaf });
    io.to(`server:${v.serverId}`).emit("voice:state", voiceDTO(channelId));
  });
  socket.on("typing", (channelId: string) => {
    if (socket.rooms.has(channelId)) socket.to(channelId).emit("typing", { channelId, userId });
  });
  socket.on("disconnect", () => {
    const n = (online.get(userId) ?? 1) - 1;
    if (n <= 0) {
      online.delete(userId); io.emit("presence", { userId, online: false });
      prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => {});
      // do NOT drop them from the voice list now: the chat socket may just have blipped while the call is fine.
      // LiveKit decides; the check is forced only if they did not already reconnect in the meantime.
      setTimeout(() => void reconcileVoice((online.get(userId) ?? 0) === 0 ? userId : undefined), 2500);
    }
    else online.set(userId, n);
  });
});

// ---- dev seed: two ready-made test accounts sharing one server ----
if (process.env.NODE_ENV !== "production" || process.env.SEED_TEST_USERS === "1") {
  const users = [];
  for (const n of ["teste1", "teste2"]) {
    users.push(await prisma.user.upsert({
      where: { username: n }, update: { email: `${n}@cohle.dev`, emailVerifiedAt: new Date(), tag: n === "teste1" ? "te01" : "te02" },
      create: { email: `${n}@cohle.dev`, username: n, tag: n === "teste1" ? "te01" : "te02", passwordHash: await hash("teste12345"), emailVerifiedAt: new Date() },
    }));
  }
  if (!(await prisma.server.findFirst({ where: { name: "Servidor de Teste" } }))) {
    await prisma.server.create({
      data: {
        name: "Servidor de Teste",
        members: { create: users.map((u, i) => ({ userId: u.id, role: i === 0 ? "OWNER" : "MEMBER" })) },
        channels: { create: [{ name: "geral", type: "TEXT" }, { name: "Sala de voz", type: "VOICE" }] },
      },
    });
  }
}

app.setErrorHandler((err: any, req, reply) => {
  if (accountGone(err)) {
    req.log.info({ constraint: err.meta?.constraint }, "session user missing");
    return reply.code(401).send({ error: "unauthorized" });
  }
  return reply.send(err);
});

try { await seedCatalog(prisma); } catch (e) { console.error("shop catalog seed failed", e); }
await app.listen({ port: Number(process.env.PORT ?? 3001), host: "0.0.0.0" });
