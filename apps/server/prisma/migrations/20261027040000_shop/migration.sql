-- Visual-items shop (Preview Beta)
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "categoria" TEXT NOT NULL,
    "sazonal" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "inicio" TIMESTAMP(3),
    "fim" TIMESTAMP(3),
    "bonus" TEXT,
    "bannerUrl" TEXT,
    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Collection_key_key" ON "Collection"("key");

CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "raridade" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "assetUrl" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "isFreeBeta" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "collectionId" TEXT,
    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ShopItem_raridade_chk" CHECK ("raridade" IN ('comum','raro','epico','lendario')),
    CONSTRAINT "ShopItem_price_chk" CHECK ("price" >= 0)
);
CREATE UNIQUE INDEX "ShopItem_key_key" ON "ShopItem"("key");
CREATE INDEX "ShopItem_collectionId_idx" ON "ShopItem"("collectionId");
ALTER TABLE "ShopItem" ADD CONSTRAINT "ShopItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserItem" (
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'beta',
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserItem_pkey" PRIMARY KEY ("userId", "itemId")
);
ALTER TABLE "UserItem" ADD CONSTRAINT "UserItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserItem" ADD CONSTRAINT "UserItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserEquipped" (
    "userId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    CONSTRAINT "UserEquipped_pkey" PRIMARY KEY ("userId", "slot"),
    CONSTRAINT "UserEquipped_slot_chk" CHECK ("slot" IN ('frame','badge','theme','entrance','name_effect','banner','pet','status'))
);
ALTER TABLE "UserEquipped" ADD CONSTRAINT "UserEquipped_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserEquipped" ADD CONSTRAINT "UserEquipped_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ShopItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ServerSetting" (
    "serverId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    CONSTRAINT "ServerSetting_pkey" PRIMARY KEY ("serverId", "key")
);
ALTER TABLE "ServerSetting" ADD CONSTRAINT "ServerSetting_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserPrefs" (
    "userId" TEXT NOT NULL,
    "effectsOff" BOOLEAN NOT NULL DEFAULT false,
    "soundsOff" BOOLEAN NOT NULL DEFAULT false,
    "seasonalAuto" BOOLEAN NOT NULL DEFAULT true,
    "hidePolitical" BOOLEAN NOT NULL DEFAULT false,
    "lite" TEXT NOT NULL DEFAULT 'auto',
    CONSTRAINT "UserPrefs_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "UserPrefs_lite_chk" CHECK ("lite" IN ('auto','on','off'))
);
ALTER TABLE "UserPrefs" ADD CONSTRAINT "UserPrefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserStats" (
    "userId" TEXT NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "voiceMinutes" INTEGER NOT NULL DEFAULT 0,
    "longestCallMin" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase exposes `public` over REST: keep every new table closed (see 20261026200000_enable_rls). Only the API reads and writes them.
ALTER TABLE "Collection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShopItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserEquipped" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServerSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserPrefs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserStats" ENABLE ROW LEVEL SECURITY;
