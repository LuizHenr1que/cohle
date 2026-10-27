// Messages: channel + direct. History kept to the last 15 of each conversation, replies, icon reactions, deleting, and file / image attachments.
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import type { Server as IOServer } from "socket.io";
import { sendMessageSchema, reactionSchema, REACTION_KEYS, KEEP_MESSAGES, MAX_FILES, nameOf, type MessageDTO, type DirectMessageDTO, type ReactionDTO, type ReplyDTO, type AttachmentDTO, type UserDTO } from "@cohle/shared";
import { MAX_UPLOAD, processUpload, Reject, safeName, fileSig, sigOk, dispositionOf } from "./files.js";

type Deps = {
  prisma: PrismaClient; io: () => IOServer; auth: (req: any, reply: any) => Promise<any>; uid: (req: any) => string;
  toUser: (u: any) => UserDTO; lightUser: any;
  memberOfChannel: (userId: string, channelId: string) => Promise<{ id: string; serverId: string } | null>;
  isOwner: (userId: string, serverId: string) => Promise<boolean>;
  canDm: (a: string, b: string) => Promise<boolean>;
};
export type SendResult<T> = { ok: true; message: T } | { error: string };

const ATT = { id: true, name: true, mime: true, size: true, kind: true, width: true, height: true, hasThumb: true } as const;
const PENDING_MAX = 8;                                                      // uploads waiting to be attached, per person
const STORAGE_CAP = Number(process.env.ATTACH_MAX_TOTAL_MB ?? 150) * 1048576;   // all files together (the free database is 500 MB)
const PENDING_TTL = 60 * 60_000;

// small in-memory limiter per person (one API instance): `rate(userId, "send", 8, 10_000)`
const hits = new Map<string, number[]>();
function rate(userId: string, what: string, max: number, windowMs: number) {
  const k = `${what}:${userId}`, now = Date.now();
  const l = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  if (l.length >= max) { hits.set(k, l); return false; }
  l.push(now); hits.set(k, l); return true;
}
setInterval(() => { const now = Date.now(); for (const [k, l] of hits) if (!l.some((t) => now - t < 120_000)) hits.delete(k); }, 5 * 60_000).unref();

const snippet = (content: string, att?: { kind: string; name: string }) => {
  const t = content.replace(/\s+/g, " ").trim().slice(0, 120);
  return t || (att ? (att.kind === "image" ? "Imagem" : `Arquivo: ${att.name}`.slice(0, 120)) : "");
};
const reason = (e: any) => { const m = String(e?.issues?.[0]?.message ?? ""); return m === "too long" ? "too long" : m === "too many lines" ? "too many lines" : m === "empty" ? "empty" : "invalid"; };

export function setupMessaging(app: FastifyInstance, d: Deps) {
  const { prisma } = d;

  // ---- DTOs ----
  const toAttachment = (a: any): AttachmentDTO => ({
    id: a.id, name: a.name, mime: a.mime, size: a.size, kind: a.kind,
    ...(a.width ? { width: a.width, height: a.height } : {}),
    url: `/files/${a.id}/${fileSig(a.id)}`, ...(a.hasThumb ? { thumbUrl: `/files/${a.id}/${fileSig(a.id)}/thumb` } : {}),
  });
  const groupReactions = (rows: { key: string; userId: string }[] = []): ReactionDTO[] =>
    REACTION_KEYS.flatMap((key) => { const ids = rows.filter((r) => r.key === key).map((r) => r.userId); return ids.length ? [{ key, userIds: ids }] : []; });
  const replyOf = (m: any): ReplyDTO | undefined => (m.replyAuthorId ? { id: m.replyToId ?? null, authorId: m.replyAuthorId, authorName: m.replyAuthorName ?? "", text: m.replyText ?? "" } : undefined);
  const attachmentsOf = (m: any) => (m.attachments ?? []).map(toAttachment);
  const toMessage = (m: any): MessageDTO => ({
    id: m.id, channelId: m.channelId, content: m.content, createdAt: m.createdAt.toISOString(), author: d.toUser(m.author),
    ...(replyOf(m) ? { replyTo: replyOf(m) } : {}), attachments: attachmentsOf(m), reactions: groupReactions(m.reactions),
  });
  const toDm = (m: any): DirectMessageDTO => ({
    id: m.id, fromId: m.senderId, toId: m.recipientId, content: m.content, createdAt: m.createdAt.toISOString(),
    ...(replyOf(m) ? { replyTo: replyOf(m) } : {}), attachments: attachmentsOf(m), reactions: groupReactions(m.reactions),
  });
  const withRels = { attachments: { select: ATT, orderBy: { createdAt: "asc" as const } }, reactions: { select: { key: true, userId: true } } };
  const msgInclude = { author: d.lightUser, ...withRels };
  const pair = (a: string, b: string) => ({ OR: [{ senderId: a, recipientId: b }, { senderId: b, recipientId: a }] });

  // ---- the 15-message history ----
  async function pruneChannel(channelId: string) {
    const old = await prisma.message.findMany({ where: { channelId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: KEEP_MESSAGES, select: { id: true } });
    if (!old.length) return;
    const ids = old.map((o) => o.id);
    await prisma.message.deleteMany({ where: { id: { in: ids } } });                 // reactions and files go with them
    d.io().to(channelId).emit("message:gone", { channelId, ids });
  }
  async function pruneDm(a: string, b: string) {
    const old = await prisma.directMessage.findMany({ where: pair(a, b), orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: KEEP_MESSAGES, select: { id: true } });
    if (!old.length) return;
    const ids = old.map((o) => o.id);
    await prisma.directMessage.deleteMany({ where: { id: { in: ids } } });
    d.io().to(`user:${a}`).to(`user:${b}`).emit("dm:gone", { fromId: a, toId: b, ids });
  }

  async function checkAttachments(userId: string, raw: unknown) {
    const ids = [...new Set((Array.isArray(raw) ? raw : []).map(String))].slice(0, MAX_FILES + 1);
    if (!ids.length) return [] as string[];
    if (ids.length > MAX_FILES) return null;
    const n = await prisma.attachment.count({ where: { id: { in: ids }, ownerId: userId, messageId: null, dmId: null } });      // mine, uploaded, not used yet
    return n === ids.length ? ids : null;
  }

  // ---- sending (used by the socket handlers; the ack is what the apps read) ----
  async function sendChannel(userId: string, data: any): Promise<SendResult<MessageDTO>> {
    const p = sendMessageSchema.safeParse({ content: data?.content, replyToId: data?.replyToId, attachmentIds: data?.attachmentIds });
    if (!p.success) return { error: reason(p.error) };
    const ch = typeof data?.channelId === "string" ? await d.memberOfChannel(userId, data.channelId) : null;
    if (!ch) return { error: "forbidden" };
    if (!rate(userId, "send", 8, 10_000)) return { error: "slow down" };
    const ids = await checkAttachments(userId, p.data.attachmentIds);
    if (!ids) return { error: "invalid attachments" };
    let reply = {};
    if (p.data.replyToId) {
      const r = await prisma.message.findFirst({ where: { id: p.data.replyToId, channelId: ch.id }, include: { author: { select: { username: true, displayName: true } }, attachments: { select: { kind: true, name: true }, take: 1 } } });
      if (!r) return { error: "reply not found" };
      reply = { replyToId: r.id, replyAuthorId: r.authorId, replyAuthorName: nameOf(r.author), replyText: snippet(r.content, r.attachments[0]) };
    }
    const m = await prisma.message.create({ data: { channelId: ch.id, authorId: userId, content: p.data.content, ...reply, ...(ids.length ? { attachments: { connect: ids.map((id) => ({ id })) } } : {}) }, include: msgInclude });
    const dto = toMessage(m);
    d.io().to(ch.id).emit("message:new", dto);
    void pruneChannel(ch.id).catch(() => {});
    return { ok: true, message: dto };
  }

  async function sendDirect(userId: string, data: any): Promise<SendResult<DirectMessageDTO>> {
    const p = sendMessageSchema.safeParse({ content: data?.content, replyToId: data?.replyToId, attachmentIds: data?.attachmentIds });
    if (!p.success) return { error: reason(p.error) };
    const to = typeof data?.toId === "string" ? data.toId : "";
    if (!to || !(await d.canDm(userId, to))) return { error: "forbidden" };
    if (!rate(userId, "send", 8, 10_000)) return { error: "slow down" };
    const ids = await checkAttachments(userId, p.data.attachmentIds);
    if (!ids) return { error: "invalid attachments" };
    let reply = {};
    if (p.data.replyToId) {
      const r = await prisma.directMessage.findFirst({ where: { id: p.data.replyToId, ...pair(userId, to) }, include: { sender: { select: { username: true, displayName: true } }, attachments: { select: { kind: true, name: true }, take: 1 } } });
      if (!r) return { error: "reply not found" };
      reply = { replyToId: r.id, replyAuthorId: r.senderId, replyAuthorName: nameOf(r.sender), replyText: snippet(r.content, r.attachments[0]) };
    }
    const m = await prisma.directMessage.create({ data: { senderId: userId, recipientId: to, content: p.data.content, ...reply, ...(ids.length ? { attachments: { connect: ids.map((id) => ({ id })) } } : {}) }, include: withRels });
    const dto = toDm(m);
    d.io().to(`user:${to}`).to(`user:${userId}`).emit("dm:new", dto);
    void pruneDm(userId, to).catch(() => {});
    return { ok: true, message: dto };
  }

  // ---- history (always at most 15) ----
  app.get("/channels/:id/messages", { preHandler: d.auth }, async (req: any, reply) => {
    if (!(await d.memberOfChannel(d.uid(req), req.params.id))) return reply.code(403).send({ error: "forbidden" });
    const msgs = await prisma.message.findMany({ where: { channelId: req.params.id }, include: msgInclude, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: KEEP_MESSAGES });
    return msgs.reverse().map(toMessage);
  });
  app.get("/dms/:peerId/messages", { preHandler: d.auth }, async (req: any) => {
    const me = d.uid(req), peer = String(req.params.peerId);
    const msgs = await prisma.directMessage.findMany({ where: pair(me, peer), include: withRels, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: KEEP_MESSAGES });
    return { messages: msgs.reverse().map(toDm), more: false };
  });

  // ---- reactions (toggle) ----
  app.post("/messages/:id/reactions", { preHandler: d.auth }, async (req: any, reply) => {
    const me = d.uid(req), id = String(req.params.id), p = reactionSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid input" });
    if (!rate(me, "react", 40, 10_000)) return reply.code(429).send({ error: "slow down" });
    const m = await prisma.message.findUnique({ where: { id }, select: { channelId: true } });
    if (!m || !(await d.memberOfChannel(me, m.channelId))) return reply.code(404).send({ error: "not found" });
    const ex = await prisma.reaction.findFirst({ where: { messageId: id, userId: me, key: p.data.key }, select: { id: true } });
    if (ex) await prisma.reaction.delete({ where: { id: ex.id } }); else await prisma.reaction.create({ data: { messageId: id, userId: me, key: p.data.key } });
    const reactions = groupReactions(await prisma.reaction.findMany({ where: { messageId: id }, select: { key: true, userId: true } }));
    d.io().to(m.channelId).emit("message:reactions", { channelId: m.channelId, id, reactions });
    return { reactions };
  });
  app.post("/dm-messages/:id/reactions", { preHandler: d.auth }, async (req: any, reply) => {
    const me = d.uid(req), id = String(req.params.id), p = reactionSchema.safeParse(req.body);
    if (!p.success) return reply.code(400).send({ error: "invalid input" });
    if (!rate(me, "react", 40, 10_000)) return reply.code(429).send({ error: "slow down" });
    const m = await prisma.directMessage.findUnique({ where: { id }, select: { senderId: true, recipientId: true } });
    if (!m || (m.senderId !== me && m.recipientId !== me)) return reply.code(404).send({ error: "not found" });
    const ex = await prisma.reaction.findFirst({ where: { dmId: id, userId: me, key: p.data.key }, select: { id: true } });
    if (ex) await prisma.reaction.delete({ where: { id: ex.id } }); else await prisma.reaction.create({ data: { dmId: id, userId: me, key: p.data.key } });
    const reactions = groupReactions(await prisma.reaction.findMany({ where: { dmId: id }, select: { key: true, userId: true } }));
    d.io().to(`user:${m.senderId}`).to(`user:${m.recipientId}`).emit("dm:reactions", { fromId: m.senderId, toId: m.recipientId, id, reactions });
    return { reactions };
  });

  // ---- deleting: your own message, or any message in a server you own ----
  app.delete("/messages/:id", { preHandler: d.auth }, async (req: any, reply) => {
    const me = d.uid(req), id = String(req.params.id);
    const m = await prisma.message.findUnique({ where: { id }, select: { authorId: true, channelId: true, channel: { select: { serverId: true } } } });
    if (!m) return reply.code(404).send({ error: "not found" });
    if (m.authorId !== me && !(await d.isOwner(me, m.channel.serverId))) return reply.code(403).send({ error: "forbidden" });
    await prisma.message.delete({ where: { id } });
    d.io().to(m.channelId).emit("message:gone", { channelId: m.channelId, ids: [id] });
    return { ok: true };
  });
  app.delete("/dm-messages/:id", { preHandler: d.auth }, async (req: any, reply) => {
    const me = d.uid(req), id = String(req.params.id);
    const m = await prisma.directMessage.findUnique({ where: { id }, select: { senderId: true, recipientId: true } });
    if (!m) return reply.code(404).send({ error: "not found" });
    if (m.senderId !== me) return reply.code(403).send({ error: "forbidden" });
    await prisma.directMessage.delete({ where: { id } });
    d.io().to(`user:${m.senderId}`).to(`user:${m.recipientId}`).emit("dm:gone", { fromId: m.senderId, toId: m.recipientId, ids: [id] });
    return { ok: true };
  });

  // ---- uploads: raw bytes in the body (no multipart), name in the query. Returns the attachment to put on the next message. ----
  app.addContentTypeParser("application/octet-stream", { parseAs: "buffer", bodyLimit: MAX_UPLOAD + 1024 }, (_req, body, done) => done(null, body));
  app.post("/uploads", { preHandler: d.auth, bodyLimit: MAX_UPLOAD + 1024 }, async (req: any, reply) => {
    const me = d.uid(req);
    if (!rate(me, "upload", 12, 60_000)) return reply.code(429).send({ error: "too many uploads" });
    const body = req.body;
    if (!Buffer.isBuffer(body) || !body.length) return reply.code(400).send({ error: "empty" });
    let name = "arquivo"; try { name = safeName(decodeURIComponent(String(req.query?.name ?? ""))); } catch { /* keep the default */ }
    const [pending, used] = await Promise.all([
      prisma.attachment.count({ where: { ownerId: me, messageId: null, dmId: null } }),
      prisma.attachment.aggregate({ _sum: { size: true } }),
    ]);
    if (pending >= PENDING_MAX) return reply.code(429).send({ error: "too many pending" });
    if ((used._sum.size ?? 0) + body.length > STORAGE_CAP) return reply.code(507).send({ error: "storage full" });
    let out;
    try { out = await processUpload(body, name); }
    catch (e) { if (e instanceof Reject) return reply.code(e.code === "heavy" ? 413 : e.code === "blocked" ? 403 : 415).send({ error: e.code }); throw e; }
    const row = await prisma.attachment.create({
      data: { ownerId: me, name: out.name, mime: out.mime, size: out.data.length, kind: out.kind, width: out.width, height: out.height, hasThumb: !!out.thumb, data: out.data as any, thumb: (out.thumb ?? null) as any },
      select: ATT,
    });
    return toAttachment(row);
  });
  // taking a file out of the message box before sending: gone at once (only yours, only while it is still waiting to be attached)
  app.delete("/uploads/:id", { preHandler: d.auth }, async (req: any) => {
    await prisma.attachment.deleteMany({ where: { id: String(req.params.id), ownerId: d.uid(req), messageId: null, dmId: null } });
    return { ok: true };
  });
  // an upload that was never attached to a message is swept after an hour
  const sweep = () => prisma.attachment.deleteMany({ where: { messageId: null, dmId: null, createdAt: { lt: new Date(Date.now() - PENDING_TTL) } } }).catch(() => {});
  setInterval(() => { void sweep(); }, 10 * 60_000).unref(); void sweep();

  // ---- downloads: /files/:id/:sig (and /thumb). Signed, immutable, never rendered as anything but what we verified it to be ----
  const secureHeaders = (reply: any) => reply
    .header("X-Content-Type-Options", "nosniff").header("Content-Security-Policy", "default-src 'none'; sandbox")
    .header("Cross-Origin-Resource-Policy", "cross-origin").header("Cache-Control", "private, max-age=31536000, immutable");
  const serve = (thumb: boolean) => async (req: any, reply: any) => {
    const { id, sig } = req.params as { id: string; sig: string };
    if (!sigOk(id, sig)) return reply.code(404).send();
    const a = await prisma.attachment.findUnique({ where: { id }, select: { name: true, kind: true, hasThumb: true } });
    if (!a) return reply.code(404).send();
    const useThumb = thumb && a.hasThumb;
    const row = await prisma.attachment.findUnique({ where: { id }, select: useThumb ? { thumb: true } : { data: true } });
    const bytes = (useThumb ? (row as any)?.thumb : (row as any)?.data) as Buffer | null | undefined;
    if (!bytes) return reply.code(404).send();
    secureHeaders(reply)
      .header("Content-Type", a.kind === "image" ? "image/webp" : "application/octet-stream")      // files are never given a type the browser could act on
      .header("Content-Disposition", dispositionOf(a.kind as "image" | "file", a.name))
      .header("Content-Length", bytes.length);
    return reply.send(Buffer.from(bytes));
  };
  app.get("/files/:id/:sig", serve(false));
  app.get("/files/:id/:sig/thumb", serve(true));

  return { sendChannel, sendDirect, toMessage, toDm, withRels, pair };
}
