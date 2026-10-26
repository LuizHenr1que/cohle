// Admin: roles, usage metrics and the free-plan watch. Everything here is read on demand (the panel polls only while it is open);
// the only background work is one tiny write every 5 minutes and one counter flush per minute while someone is in a call.
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { AdminOverviewDTO, AdminUserRow, AdminSeriesDTO, AdminAccessRow, QuotaDTO, AdminUsageDTO, UpgradeDTO, CostDTO } from "@cohle/shared";

// The company master account(s): matched by CONFIRMED e-mail only, so the role can never be claimed by typing a name.
const OWNER_EMAILS = new Set(["verticeappempresa@gmail.com", ...(process.env.OWNER_EMAILS ?? "").split(",")].map((e) => e.trim().toLowerCase()).filter(Boolean));
export type Role = "USER" | "ADMIN" | "OWNER";
export const roleOf = (u: { email: string; emailVerifiedAt: Date | null; role: string }): Role =>
  u.emailVerifiedAt && OWNER_EMAILS.has(u.email.toLowerCase()) ? "OWNER" : u.role === "ADMIN" ? "ADMIN" : "USER";

// Free-plan ceilings. Defaults follow docs/render.md; override with env if a provider changes its plan.
const LIMITS = {
  renderHours: Number(process.env.PLAN_RENDER_HOURS ?? 750),
  renderMemMb: Number(process.env.PLAN_RENDER_MEM_MB ?? 512),
  dbMb: Number(process.env.PLAN_DB_MB ?? 500),
  voiceMinutes: Number(process.env.PLAN_LIVEKIT_MINUTES ?? 5000),
};
const SAMPLE_MS = 5 * 60_000;

// What to pay when a free limit is not enough. Official prices (USD/month) checked on 2026-10-26 at render.com/pricing,
// supabase.com/pricing and livekit.com/pricing. BRL is an estimate: the exchange rate is a setting, not a live quote.
const USD_BRL = Number(process.env.PLAN_USD_BRL ?? 5.5);
const PRICES_CHECKED = "2026-10-26";
const up = (provider: string, plan: string, gives: string, usd: number): UpgradeDTO => ({ provider, plan, gives, usd, brl: Math.round(usd * USD_BRL * 100) / 100 });
const UPGRADE = {
  "render-hours": up("Render", "Render pago (menos de 1 CPU, 512 MB)", "Não dorme e não tem o limite de 750 horas", 7),
  "render-mem": up("Render", "Render 1 CPU e 2 GB de memória", "4 vezes mais memória: o servidor para de reiniciar por falta dela", 25),
  db: up("Supabase", "Supabase Pro", "8 GB de banco, backup diário por 7 dias e nunca pausa", 25),
  livekit: up("LiveKit", "LiveKit Ship", "150.000 minutos de chamada, 250 GB de banda e 1.000 conexões", 50),
} as const;
const cost = (qs: QuotaDTO[]): CostDTO => {
  // Render hours and Render memory are the same service: the bigger plan covers both, so pay once.
  const by = new Map<string, UpgradeDTO>();
  for (const q of qs) { const cur = by.get(q.next.provider); if (!cur || q.next.usd > cur.usd) by.set(q.next.provider, q.next); }
  const list = [...by.values()], usd = list.reduce((a, b) => a + b.usd, 0);
  return { usd, brl: Math.round(usd * USD_BRL * 100) / 100, items: list.map((u) => u.plan) };
};

const day = (d = new Date()) => d.toISOString().slice(0, 10);
const monthStart = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const daysInMonth = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
const mb = (n: number) => Math.round(n / 1048576);

export function registerAdmin(app: FastifyInstance, d: {
  prisma: PrismaClient; auth: (req: any, reply: any) => Promise<any>; uid: (req: any) => string;
  live: () => { online: number; voice: number; rooms: number }; isOnline: (id: string) => boolean;
}) {
  const { prisma } = d;

  // ---- background: samples + voice minutes (batched) ----
  let pendingMinutes = 0;
  const flushMinutes = async () => {
    if (!pendingMinutes) return;
    const n = pendingMinutes; pendingMinutes = 0;
    await prisma.dailyUsage.upsert({ where: { day: day() }, create: { day: day(), voiceMinutes: n }, update: { voiceMinutes: { increment: n } } }).catch(() => { pendingMinutes += n; });
  };
  const dbSizeMb = async () => Number((await prisma.$queryRaw<{ s: bigint }[]>`select pg_database_size(current_database()) as s`)[0].s) / 1048576;
  const sample = async () => {
    const l = d.live();
    await prisma.metricSample.create({ data: { online: l.online, voice: l.voice, rssMb: mb(process.memoryUsage().rss) } }).catch(() => {});
    const size = Math.round((await dbSizeMb().catch(() => 0)) * 10) / 10;
    if (size) await prisma.dailyUsage.upsert({ where: { day: day() }, create: { day: day(), dbMb: size }, update: { dbMb: size } }).catch(() => {});
    const ago = (days: number) => new Date(Date.now() - days * 86_400_000);
    await prisma.accessLog.deleteMany({ where: { at: { lt: ago(90) } } }).catch(() => {});
    await prisma.metricSample.deleteMany({ where: { at: { lt: ago(60) } } }).catch(() => {});
  };
  setInterval(() => { const v = d.live().voice; if (v) pendingMinutes += v; }, 60_000).unref();      // participant-minutes, like LiveKit bills
  setInterval(() => { void flushMinutes(); }, 5 * 60_000).unref();
  setInterval(() => { void sample(); }, SAMPLE_MS).unref();
  setTimeout(() => { void sample(); }, 10_000).unref();                                              // a sample right after waking up
  const shutdown = () => { void flushMinutes(); };
  process.once("SIGTERM", shutdown);

  // ---- who is an admin: always read from the database, never trusted from the token ----
  const needAdmin = async (req: any, reply: any) => {
    const u = await prisma.user.findUnique({ where: { id: d.uid(req) }, select: { email: true, emailVerifiedAt: true, role: true } });
    const r = u ? roleOf(u) : "USER";
    if (r === "USER") return reply.code(403).send({ error: "forbidden" });
    req.role = r;
  };
  const pre = { preHandler: [d.auth, needAdmin] };

  app.get("/admin/overview", pre, async (): Promise<AdminOverviewDTO> => {
    const h = (n: number) => new Date(Date.now() - n * 3_600_000);
    const [total, verified, new24h, new7d, active24h, active7d, servers, channels, messages, dms, size] = await Promise.all([
      prisma.user.count(), prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
      prisma.user.count({ where: { createdAt: { gt: h(24) } } }), prisma.user.count({ where: { createdAt: { gt: h(168) } } }),
      prisma.user.count({ where: { lastSeenAt: { gt: h(24) } } }), prisma.user.count({ where: { lastSeenAt: { gt: h(168) } } }),
      prisma.server.count(), prisma.channel.count(), prisma.message.count(), prisma.directMessage.count(), dbSizeMb().catch(() => 0),
    ]);
    const m = process.memoryUsage();
    return {
      users: { total, verified, new24h, new7d, active24h, active7d },
      live: d.live(), content: { servers, channels, messages, dms },
      process: { rssMb: mb(m.rss), heapMb: mb(m.heapUsed), uptimeSec: Math.round(process.uptime()), node: process.version },
      dbMb: Math.round(size * 10) / 10,
    };
  });

  app.get("/admin/users", pre, async (req: any): Promise<{ rows: AdminUserRow[]; total: number }> => {
    const q = z.object({ q: z.string().trim().max(60).optional(), page: z.coerce.number().int().min(0).max(10_000).default(0) }).parse(req.query);
    const where: Prisma.UserWhereInput = q.q ? { OR: [{ email: { contains: q.q, mode: "insensitive" } }, { username: { contains: q.q, mode: "insensitive" } }] } : {};
    const [rows, total] = await Promise.all([
      prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: q.page * 25, take: 25, select: { id: true, username: true, tag: true, email: true, role: true, emailVerifiedAt: true, createdAt: true, lastSeenAt: true, _count: { select: { members: true } } } }),
      prisma.user.count({ where }),
    ]);
    return {
      total,
      rows: rows.map((u) => ({
        id: u.id, username: u.username, tag: u.tag ?? "", email: u.email, role: roleOf(u), verified: !!u.emailVerifiedAt,
        createdAt: u.createdAt.toISOString(), lastSeenAt: u.lastSeenAt?.toISOString() ?? null, online: d.isOnline(u.id), servers: u._count.members,
      })),
    };
  });

  app.get("/admin/accesses", pre, async (): Promise<AdminAccessRow[]> => {
    const rows = await prisma.accessLog.findMany({ orderBy: { at: "desc" }, take: 40, include: { user: { select: { username: true, email: true } } } });
    return rows.map((r) => ({ id: r.id, kind: r.kind as AdminAccessRow["kind"], at: r.at.toISOString(), username: r.user.username, email: r.user.email }));
  });

  app.get("/admin/series", pre, async (req: any): Promise<AdminSeriesDTO> => {
    const { range } = z.object({ range: z.enum(["24h", "7d", "30d"]).default("24h") }).parse(req.query);
    const hours = range === "24h" ? 24 : range === "7d" ? 168 : 720, bucket = range === "24h" ? 900 : range === "7d" ? 7200 : 28800;   // ≈ 100 points
    const since = new Date(Date.now() - hours * 3_600_000);
    const pts = await prisma.$queryRaw<{ t: Date; online: number; peak: number; voice: number; rss: number }[]>`
      select to_timestamp(floor(extract(epoch from "at") / ${bucket}) * ${bucket}) as t, round(avg(online)::numeric, 1)::float as online, max(online)::int as peak,
             round(avg(voice)::numeric, 1)::float as voice, round(avg("rssMb"))::int as rss
      from "MetricSample" where "at" > ${since} group by 1 order by 1`;
    const acc = await prisma.$queryRaw<{ d: string; kind: string; n: number }[]>`
      select to_char("at" at time zone 'UTC', 'YYYY-MM-DD') as d, kind, count(*)::int as n from "AccessLog" where "at" > ${new Date(Date.now() - 30 * 86_400_000)} group by 1, 2`;
    const usage = await prisma.dailyUsage.findMany({ where: { day: { gte: day(new Date(Date.now() - 30 * 86_400_000)) } } });
    const days = new Map<string, AdminSeriesDTO["days"][number]>();
    for (let i = 29; i >= 0; i--) { const k = day(new Date(Date.now() - i * 86_400_000)); days.set(k, { day: k, register: 0, login: 0, open: 0, voiceMinutes: 0, dbMb: 0 }); }
    for (const a of acc) { const r = days.get(a.d); if (r && (a.kind === "register" || a.kind === "login" || a.kind === "open")) r[a.kind] = a.n; }
    for (const u of usage) { const r = days.get(u.day); if (r) { r.voiceMinutes = u.voiceMinutes; r.dbMb = u.dbMb; } }
    return { points: pts.map((p) => ({ ...p, t: p.t.toISOString() })), days: [...days.values()] };
  });

  // ---- free-plan watch: used so far, where this month is heading, and when (if ever) it hits the ceiling ----
  app.get("/admin/usage", pre, async (): Promise<AdminUsageDTO> => {
    const now = new Date(), ms = monthStart(now), dim = daysInMonth(now);
    const elapsedDays = Math.max((now.getTime() - ms.getTime()) / 86_400_000, 0.05);
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const level = (ratio: number, warn = 0.8): QuotaDTO["level"] => (ratio >= 1 ? "over" : ratio >= warn ? "warn" : "ok");
    // when would the ceiling be crossed at today's pace? null = it would not before the month (or the stat) resets
    const runsOutAt = (used: number, perDay: number, limit: number, until: Date | null) => {
      if (used >= limit) return now.toISOString();
      if (perDay <= 0) return null;
      const at = new Date(now.getTime() + ((limit - used) / perDay) * 86_400_000);
      return until && at > until ? null : at.toISOString();
    };

    const [first, count, peakRow, voiceRows, firstDb] = await Promise.all([
      prisma.metricSample.findFirst({ where: { at: { gte: ms } }, orderBy: { at: "asc" }, select: { at: true } }),
      prisma.metricSample.count({ where: { at: { gte: ms } } }),
      prisma.metricSample.aggregate({ where: { at: { gte: ms } }, _max: { rssMb: true } }),
      prisma.dailyUsage.aggregate({ where: { day: { gte: day(ms) } }, _sum: { voiceMinutes: true } }),
      prisma.dailyUsage.findFirst({ where: { day: { gte: day(ms) }, dbMb: { gt: 0 } }, orderBy: { day: "asc" } }),
    ]);

    // Render hours: we only have a sample while the API is awake, so awake-hours ≈ samples × 5 min.
    const awakeH = (count * SAMPLE_MS) / 3_600_000;
    const observedH = first ? Math.max((now.getTime() - first.at.getTime()) / 3_600_000, 0.1) : 0.1;
    const awakeShare = Math.min(awakeH / observedH, 1);
    const projHours = Math.min(awakeShare, 1) * dim * 24;
    const hours: QuotaDTO = {
      id: "render-hours", next: UPGRADE["render-hours"], label: "Render: horas ligado no mês", unit: "h", used: Math.round(awakeH * 10) / 10, limit: LIMITS.renderHours,
      projected: Math.round(projHours), level: level(projHours / LIMITS.renderHours, 0.95), runsOutAt: runsOutAt(awakeH, awakeShare * 24, LIMITS.renderHours, monthEnd),
      note: "Estimado pelas medições do Cohle (uma a cada 5 min enquanto o servidor está acordado). Conta de verdade: painel do Render.",
    };

    const rss = mb(process.memoryUsage().rss), peak = Math.max(peakRow._max.rssMb ?? 0, rss);
    const mem: QuotaDTO = {
      id: "render-mem", next: UPGRADE["render-mem"], label: "Render: memória (pico do mês)", unit: "MB", used: rss, limit: LIMITS.renderMemMb, projected: peak,
      level: level(peak / LIMITS.renderMemMb, 0.75), runsOutAt: null, note: `Agora ${rss} MB. Passou de ${LIMITS.renderMemMb} MB o Render derruba o processo.`,
    };

    const dbNow = Math.round((await dbSizeMb().catch(() => 0)) * 10) / 10;
    const dbPerDay = firstDb && firstDb.dbMb > 0 && dbNow > firstDb.dbMb ? (dbNow - firstDb.dbMb) / Math.max((now.getTime() - new Date(firstDb.day + "T00:00:00Z").getTime()) / 86_400_000, 1) : 0;
    const dbProj = dbNow + dbPerDay * (dim - elapsedDays);
    const db: QuotaDTO = {
      id: "db", next: UPGRADE.db, label: "Supabase: tamanho do banco", unit: "MB", used: dbNow, limit: LIMITS.dbMb, projected: Math.round(dbProj),
      level: level(dbProj / LIMITS.dbMb), runsOutAt: runsOutAt(dbNow, dbPerDay, LIMITS.dbMb, null), note: "Inclui as tabelas do próprio Supabase. Sem backup automático no plano grátis.",
    };

    const vUsed = voiceRows._sum.voiceMinutes ?? 0, vPerDay = vUsed / elapsedDays, vProj = Math.round(vPerDay * dim);
    const voice: QuotaDTO = {
      id: "livekit", next: UPGRADE.livekit, label: "LiveKit: minutos de chamada no mês", unit: "min", used: vUsed, limit: LIMITS.voiceMinutes, projected: vProj,
      level: level(vProj / LIMITS.voiceMinutes), runsOutAt: runsOutAt(vUsed, vPerDay, LIMITS.voiceMinutes, monthEnd),
      note: "Soma de minutos de cada pessoa na sala, medida pelo Cohle (é como o LiveKit cobra). Confira o limite do seu plano em livekit.io/pricing.",
    };
    const quotas = [hours, mem, db, voice];
    return {
      month: ms.toISOString().slice(0, 7), resetsAt: monthEnd.toISOString(), quotas, rate: USD_BRL, pricesCheckedAt: PRICES_CHECKED,
      costNeeded: cost(quotas.filter((q) => q.level === "over")), costIfWarn: cost(quotas.filter((q) => q.level !== "ok")),
    };
  });

  // Only the master (OWNER) hands out or takes back the admin role. The master itself is fixed.
  app.post("/admin/users/:id/role", pre, async (req: any, reply) => {
    if (req.role !== "OWNER") return reply.code(403).send({ error: "forbidden" });
    const body = z.object({ role: z.enum(["USER", "ADMIN"]) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "invalid input" });
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) return reply.code(404).send({ error: "not found" });
    if (roleOf(target) === "OWNER") return reply.code(400).send({ error: "owner is fixed" });
    if (body.data.role === "ADMIN" && !target.emailVerifiedAt) return reply.code(400).send({ error: "email not verified" });
    await prisma.user.update({ where: { id: target.id }, data: { role: body.data.role } });
    return { ok: true };
  });
}
