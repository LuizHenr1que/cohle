ALTER TABLE "User" ADD COLUMN "bio" TEXT, ADD COLUMN "bannerColor" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_bio_len_chk" CHECK ("bio" IS NULL OR char_length("bio") <= 190);
ALTER TABLE "User" ADD CONSTRAINT "User_bannerColor_chk" CHECK ("bannerColor" IS NULL OR "bannerColor" ~ '^#[0-9a-f]{6}$');

ALTER TABLE "Friendship" ADD COLUMN "acceptedAt" TIMESTAMP(3);
UPDATE "Friendship" SET "acceptedAt" = "createdAt" WHERE "status" = 'ACCEPTED';

CREATE TABLE "UserNote" (
    "authorId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserNote_pkey" PRIMARY KEY ("authorId", "targetId"),
    CONSTRAINT "UserNote_len_chk" CHECK (char_length("text") BETWEEN 1 AND 256)
);
ALTER TABLE "UserNote" ADD CONSTRAINT "UserNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserNote" ADD CONSTRAINT "UserNote_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Supabase exposes `public` over REST: keep the new table closed (see 20261026200000_enable_rls)
ALTER TABLE "UserNote" ENABLE ROW LEVEL SECURITY;
