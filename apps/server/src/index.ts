import "./env.js";
import { randomBytes } from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import { Server as IOServer } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { hash, verify } from "@node-rs/argon2";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import {
  registerSchema, loginSchema, updateProfileSchema, createServerSchema, updateServerSchema, banSchema, muteSchema, updateChannelSchema, createChannelSchema, sendMessageSchema,
  type MessageDTO, type ServerDTO, type UserDTO, type MemberDTO, type BanDTO,
} from "@cohle/shared";

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
const authLimit = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };
await app.register(jwt, { secret: process.env.JWT_SECRET ?? "dev-secret" });

const auth = async (req: any, reply: any) => {
  try { await req.jwtVerify(); } catch { reply.code(401).send({ error: "unauthorized" }); }
};
const uid = (req: any): string => req.user.sub;

// Images are never inlined in API payloads: DTOs carry a versioned URL the browser can cache forever.
const toUser = (u: any): UserDTO => ({
  id: u.id, username: u.username, avatarUrl: u.avatarVersion > 0 ? `/avatars/${u.id}?v=${u.avatarVersion}` : null,
});
// Strip heavy/private columns when a user is only embedded in another payload.
const lightUser = { omit: { avatarUrl: true, passwordHash: true, email: true } } as const;
const lightServer = { omit: { iconUrl: true } } as const;
const toMessage = (m: any): MessageDTO => ({
  id: m.id, channelId: m.channelId, content: m.content,
  createdAt: m.createdAt.toISOString(),
  author: toUser(m.author),
});
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

app.get("/health", async () => ({ ok: true, name: "cohle" }));

// ---- auth ----
app.post("/auth/register", authLimit, async (req, reply) => {
  const p = registerSchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid input" });
  const exists = await prisma.user.findFirst({
    where: { OR: [{ email: p.data.email }, { username: p.data.username }] },
  });
  if (exists) return reply.code(409).send({ error: "email or username already in use" });
  const user = await prisma.user.create({
    data: { email: p.data.email, username: p.data.username, passwordHash: await hash(p.data.password) },
  });
  return { token: app.jwt.sign({ sub: user.id }), user: toUser(user) };
});

app.post("/auth/login", authLimit, async (req, reply) => {
  const p = loginSchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid input" });
  const user = await prisma.user.findUnique({ where: { email: p.data.email } });
  if (!user || !(await verify(user.passwordHash, p.data.password)))
    return reply.code(401).send({ error: "invalid credentials" });
  return { token: app.jwt.sign({ sub: user.id }), user: toUser(user) };
});

app.get("/me", { preHandler: auth }, async (req, reply) => {
  const u = await prisma.user.findUnique({ where: { id: uid(req) }, ...lightUser });
  return u ? toUser(u) : reply.code(404).send({ error: "not found" });
});

app.patch("/me", { preHandler: auth }, async (req, reply) => {
  const p = updateProfileSchema.safeParse(req.body);
  if (!p.success) return reply.code(400).send({ error: "invalid input" });
  if (p.data.username) {
    const taken = await prisma.user.findFirst({ where: { username: p.data.username, NOT: { id: uid(req) } } });
    if (taken) return reply.code(409).send({ error: "username already in use" });
  }
  const { avatarUrl, ...rest } = p.data;
  const u = await prisma.user.update({
    where: { id: uid(req) },
    data: { ...rest, ...(avatarUrl !== undefined ? { avatarUrl, avatarVersion: avatarUrl ? { increment: 1 } : 0 } : {}) },
    ...lightUser,
  });
  return toUser(u);
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
  const s = await prisma.server.findUnique({ where: { inviteCode: req.params.code }, include: serverInclude, ...lightServer });
  if (!s) return reply.code(404).send({ error: "convite não encontrado" });
  if (await prisma.ban.findUnique({ where: { serverId_userId: { serverId: s.id, userId: uid(req) } } }))
    return reply.code(403).send({ error: "você foi banido deste servidor" });
  await prisma.member.upsert({
    where: { userId_serverId: { userId: uid(req), serverId: s.id } },
    create: { userId: uid(req), serverId: s.id }, update: {},
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
async function memberOfChannel(userId: string, channelId: string) {
  const ch = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!ch) return null;
  const m = await prisma.member.findUnique({ where: { userId_serverId: { userId, serverId: ch.serverId } } });
  return m ? ch : null;
}

app.get("/channels/:id/messages", { preHandler: auth }, async (req: any, reply) => {
  if (!(await memberOfChannel(uid(req), req.params.id))) return reply.code(403).send({ error: "forbidden" });
  const msgs = await prisma.message.findMany({
    where: { channelId: req.params.id }, include: { author: lightUser },
    orderBy: { createdAt: "desc" }, take: 50,
  });
  return msgs.reverse().map(toMessage);
});

// ---- voice (LiveKit token) ----
app.post("/channels/:id/voice-token", { preHandler: auth }, async (req: any, reply) => {
  const ch = await memberOfChannel(uid(req), req.params.id);
  if (!ch || ch.type !== "VOICE") return reply.code(403).send({ error: "forbidden" });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: uid(req) }, ...lightUser });
  const member = await prisma.member.findUnique({ where: { userId_serverId: { userId: user.id, serverId: ch.serverId } } });
  const at = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, {
    identity: user.id, name: user.username,
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
const voiceDTO = (channelId: string) => ({ channelId, users: [...(voice.get(channelId)?.users.values() ?? [])] });

function leaveVoice(userId: string) {
  const channelId = voiceOf.get(userId);
  if (!channelId) return;
  voiceOf.delete(userId);
  const v = voice.get(channelId);
  if (!v) return;
  v.users.delete(userId);
  io.to(`server:${v.serverId}`).emit("voice:state", voiceDTO(channelId));
  if (v.users.size === 0) voice.delete(channelId);
}

io.use((socket, next) => {
  try {
    const payload: any = app.jwt.verify(String(socket.handshake.auth.token));
    socket.data.userId = payload.sub;
    next();
  } catch { next(new Error("unauthorized")); }
});

io.on("connection", async (socket) => {
  const userId: string = socket.data.userId;
  socket.join(`user:${userId}`);
  const memberships = await prisma.member.findMany({ where: { userId }, select: { serverId: true } });
  const serverIds = new Set(memberships.map((m) => m.serverId));
  serverIds.forEach((id) => socket.join(`server:${id}`));
  socket.emit("voice:snapshot", [...voice.entries()].filter(([, v]) => serverIds.has(v.serverId)).map(([id]) => voiceDTO(id)));

  online.set(userId, (online.get(userId) ?? 0) + 1);
  io.emit("presence", { userId, online: true });
  socket.emit("presence:snapshot", [...online.keys()]);

  socket.on("channel:join", async (channelId: string) => {
    if (await memberOfChannel(userId, channelId)) socket.join(channelId);
  });
  socket.on("message:send", async (data: { channelId: string; content: string }, ack?: Function) => {
    const p = sendMessageSchema.safeParse({ content: data?.content });
    if (!p.success || !(await memberOfChannel(userId, data.channelId))) return ack?.({ error: true });
    const m = await prisma.message.create({
      data: { channelId: data.channelId, authorId: userId, content: p.data.content }, include: { author: lightUser },
    });
    io.to(data.channelId).emit("message:new", toMessage(m));
    ack?.({ ok: true });
  });
  socket.on("server:join", async (serverId: string) => {
    const m = await prisma.member.findUnique({ where: { userId_serverId: { userId, serverId } } });
    if (m) { serverIds.add(serverId); socket.join(`server:${serverId}`); }
  });
  socket.on("voice:join", async (channelId: string) => {
    const ch = await memberOfChannel(userId, channelId);
    if (!ch || ch.type !== "VOICE") return;
    const user = await prisma.user.findUnique({ where: { id: userId }, ...lightUser });
    if (!user) return;
    if (voiceOf.get(userId) && voiceOf.get(userId) !== channelId) leaveVoice(userId);
    let v = voice.get(channelId);
    if (!v) { v = { serverId: ch.serverId, users: new Map() }; voice.set(channelId, v); }
    const member = await prisma.member.findUnique({ where: { userId_serverId: { userId, serverId: ch.serverId } } });
    v.users.set(userId, { ...toUser(user), sharing: !!socket.data.sharing, muted: !!member?.muted });
    voiceOf.set(userId, channelId);
    socket.data.voice = true;
    io.to(`server:${ch.serverId}`).emit("voice:state", voiceDTO(channelId));
  });
  socket.on("voice:leave", () => { socket.data.sharing = false; leaveVoice(userId); });
  socket.on("voice:sharing", (on: boolean) => {
    socket.data.sharing = !!on;   // remembered even if voice:join is still being processed (reconnect race)
    const channelId = voiceOf.get(userId);
    const v = channelId ? voice.get(channelId) : undefined;
    const u = v?.users.get(userId);
    if (!channelId || !v || !u) return;
    v.users.set(userId, { ...u, sharing: !!on });
    io.to(`server:${v.serverId}`).emit("voice:state", voiceDTO(channelId));
  });
  socket.on("typing", (channelId: string) => {
    if (socket.rooms.has(channelId)) socket.to(channelId).emit("typing", { channelId, userId });
  });
  socket.on("disconnect", () => {
    const n = (online.get(userId) ?? 1) - 1;
    if (n <= 0) { leaveVoice(userId); online.delete(userId); io.emit("presence", { userId, online: false }); }
    else online.set(userId, n);
  });
});

// ---- dev seed: two ready-made test accounts sharing one server ----
if (process.env.NODE_ENV !== "production" || process.env.SEED_TEST_USERS === "1") {
  const users = [];
  for (const n of ["teste1", "teste2"]) {
    users.push(await prisma.user.upsert({
      where: { username: n }, update: { email: `${n}@cohle.dev` },
      create: { email: `${n}@cohle.dev`, username: n, passwordHash: await hash("teste12345") },
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

await app.listen({ port: Number(process.env.PORT ?? 3001), host: "0.0.0.0" });
