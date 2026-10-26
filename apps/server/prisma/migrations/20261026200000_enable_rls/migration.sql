-- Supabase exposes the public schema through its REST API (anon/publishable key). The API server talks to Postgres
-- directly as the table owner, which bypasses RLS, so enabling RLS with no policies closes the REST door and changes nothing for the app.
-- Any new table added later needs the same line.
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Server" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Channel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ban" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DirectMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DmRead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Friendship" ENABLE ROW LEVEL SECURITY;
