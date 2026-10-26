ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER', ADD COLUMN "lastSeenAt" TIMESTAMP(3);

CREATE TABLE "AccessLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AccessLog_at_idx" ON "AccessLog"("at");
CREATE INDEX "AccessLog_userId_at_idx" ON "AccessLog"("userId", "at");
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MetricSample" (
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "online" INTEGER NOT NULL,
    "voice" INTEGER NOT NULL,
    "rssMb" INTEGER NOT NULL,
    CONSTRAINT "MetricSample_pkey" PRIMARY KEY ("at")
);

CREATE TABLE "DailyUsage" (
    "day" TEXT NOT NULL,
    "voiceMinutes" INTEGER NOT NULL DEFAULT 0,
    "dbMb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "DailyUsage_pkey" PRIMARY KEY ("day")
);

-- Supabase exposes the public schema over REST: keep the new tables closed too (see 20261026200000_enable_rls).
ALTER TABLE "AccessLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MetricSample" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyUsage" ENABLE ROW LEVEL SECURITY;
