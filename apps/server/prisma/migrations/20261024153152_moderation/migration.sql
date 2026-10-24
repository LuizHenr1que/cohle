-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "muted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Ban" (
    "serverId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ban_pkey" PRIMARY KEY ("serverId","userId")
);

-- AddForeignKey
ALTER TABLE "Ban" ADD CONSTRAINT "Ban_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ban" ADD CONSTRAINT "Ban_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
