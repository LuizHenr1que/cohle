-- Voice rooms can be locked and capped. Existing rooms stay open and unlimited.
ALTER TABLE "Channel" ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Channel" ADD COLUMN "userLimit" INTEGER;
