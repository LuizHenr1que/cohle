-- AlterTable
ALTER TABLE "Server" ADD COLUMN     "iconVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarVersion" INTEGER NOT NULL DEFAULT 0;

-- existing uploads keep working: mark rows that already have an image as version 1
UPDATE "User" SET "avatarVersion" = 1 WHERE "avatarUrl" IS NOT NULL;
UPDATE "Server" SET "iconVersion" = 1 WHERE "iconUrl" IS NOT NULL;
