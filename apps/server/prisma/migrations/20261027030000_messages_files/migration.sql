-- Free-plan history: only the last 15 messages of each channel and of each 1:1 conversation are kept. Trim what is already there.
DELETE FROM "Message" WHERE id IN (
  SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY "channelId" ORDER BY "createdAt" DESC, id DESC) AS rn FROM "Message") t WHERE rn > 15);
DELETE FROM "DirectMessage" WHERE id IN (
  SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY LEAST("senderId", "recipientId"), GREATEST("senderId", "recipientId") ORDER BY "createdAt" DESC, id DESC) AS rn FROM "DirectMessage") t WHERE rn > 15);

-- Replies (a copy of what is answered survives the original being erased)
ALTER TABLE "Message" ADD COLUMN "replyToId" TEXT, ADD COLUMN "replyAuthorId" TEXT, ADD COLUMN "replyAuthorName" TEXT, ADD COLUMN "replyText" TEXT;
ALTER TABLE "DirectMessage" ADD COLUMN "replyToId" TEXT, ADD COLUMN "replyAuthorId" TEXT, ADD COLUMN "replyAuthorName" TEXT, ADD COLUMN "replyText" TEXT;
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "DirectMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 500 characters per message from now on (NOT VALID: rows written before this migration are not re-checked)
ALTER TABLE "Message" ADD CONSTRAINT "Message_content_len_chk" CHECK (char_length("content") <= 500) NOT VALID;
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_content_len_chk" CHECK (char_length("content") <= 500) NOT VALID;

CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT,
    "dmId" TEXT,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Reaction_one_target_chk" CHECK (("messageId" IS NULL) <> ("dmId" IS NULL)),
    CONSTRAINT "Reaction_key_chk" CHECK ("key" IN ('like','love','laugh','fire','wow','sad','party','eyes'))
);
CREATE UNIQUE INDEX "Reaction_messageId_userId_key_key" ON "Reaction"("messageId", "userId", "key");
CREATE UNIQUE INDEX "Reaction_dmId_userId_key_key" ON "Reaction"("dmId", "userId", "key");
CREATE INDEX "Reaction_messageId_idx" ON "Reaction"("messageId");
CREATE INDEX "Reaction_dmId_idx" ON "Reaction"("dmId");
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_dmId_fkey" FOREIGN KEY ("dmId") REFERENCES "DirectMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "messageId" TEXT,
    "dmId" TEXT,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "hasThumb" BOOLEAN NOT NULL DEFAULT false,
    "data" BYTEA NOT NULL,
    "thumb" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Attachment_one_target_chk" CHECK (NOT ("messageId" IS NOT NULL AND "dmId" IS NOT NULL)),
    CONSTRAINT "Attachment_kind_chk" CHECK ("kind" IN ('image','file')),
    CONSTRAINT "Attachment_size_chk" CHECK ("size" BETWEEN 1 AND 12582912),
    CONSTRAINT "Attachment_name_chk" CHECK (char_length("name") BETWEEN 1 AND 120)
);
CREATE INDEX "Attachment_ownerId_createdAt_idx" ON "Attachment"("ownerId", "createdAt");
CREATE INDEX "Attachment_messageId_idx" ON "Attachment"("messageId");
CREATE INDEX "Attachment_dmId_idx" ON "Attachment"("dmId");
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_dmId_fkey" FOREIGN KEY ("dmId") REFERENCES "DirectMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase exposes `public` over REST: keep the new tables closed (see 20261026200000_enable_rls). Files are only ever served by the API.
ALTER TABLE "Reaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attachment" ENABLE ROW LEVEL SECURITY;
