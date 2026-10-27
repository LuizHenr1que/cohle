-- The Loja is locked ("Em breve") for everybody; only the owner gives items as gifts.
ALTER TABLE "ShopItem" ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserItem" ADD COLUMN "giftedBy" TEXT, ADD COLUMN "giftNote" TEXT, ADD COLUMN "seen" BOOLEAN NOT NULL DEFAULT true;
