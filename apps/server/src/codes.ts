// One-time e-mail codes: 6 digits, only a hash is stored, 15 minutes, 5 attempts, 45 s between sends.
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { CODE_MINUTES } from "./email.js";

export type CodeKind = "VERIFY" | "RESET";
const pepper = () => process.env.JWT_SECRET ?? "dev";
const digest = (userId: string, kind: string, code: string) => createHash("sha256").update(`${pepper()}|${userId}|${kind}|${code}`).digest("hex");
export const MAX_ATTEMPTS = 5, COOLDOWN_MS = 45_000;

/** Creates a new code (replacing older ones). Returns null while the previous one is too recent. */
export async function issueCode(prisma: PrismaClient, userId: string, kind: CodeKind): Promise<string | null> {
  const last = await prisma.emailCode.findFirst({ where: { userId, kind }, orderBy: { createdAt: "desc" } });
  if (last && Date.now() - last.createdAt.getTime() < COOLDOWN_MS) return null;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.emailCode.deleteMany({ where: { userId, kind } });
  await prisma.emailCode.create({ data: { userId, kind, codeHash: digest(userId, kind, code), expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000) } });
  return code;
}

export type CheckResult = "ok" | "wrong" | "expired" | "locked";
export async function checkCode(prisma: PrismaClient, userId: string, kind: CodeKind, code: string): Promise<CheckResult> {
  const row = await prisma.emailCode.findFirst({ where: { userId, kind }, orderBy: { createdAt: "desc" } });
  if (!row) return "expired";
  if (row.expiresAt.getTime() < Date.now()) { await prisma.emailCode.deleteMany({ where: { userId, kind } }); return "expired"; }
  if (row.attempts >= MAX_ATTEMPTS) { await prisma.emailCode.deleteMany({ where: { userId, kind } }); return "locked"; }
  const a = Buffer.from(row.codeHash), b = Buffer.from(digest(userId, kind, code));
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await prisma.emailCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return "wrong";
  }
  await prisma.emailCode.deleteMany({ where: { userId, kind } });
  return "ok";
}
