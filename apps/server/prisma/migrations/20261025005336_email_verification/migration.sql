-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailCode_userId_kind_createdAt_idx" ON "EmailCode"("userId", "kind", "createdAt");

-- AddForeignKey
ALTER TABLE "EmailCode" ADD CONSTRAINT "EmailCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Accounts that already exist keep working: their address counts as verified.
UPDATE "User" SET "emailVerifiedAt" = now() WHERE "emailVerifiedAt" IS NULL;
