-- @usernames are lowercase handles ([a-z0-9_.]). Older accounts could have capitals or "-": fold them, keeping the first account on a clash.
ALTER TABLE "User" ADD COLUMN "allowEmailFind" BOOLEAN NOT NULL DEFAULT true;

WITH fixed AS (
  SELECT id, lower(regexp_replace(username, '[^A-Za-z0-9_.]', '_', 'g')) AS h,
         row_number() OVER (PARTITION BY lower(regexp_replace(username, '[^A-Za-z0-9_.]', '_', 'g')) ORDER BY "createdAt") AS n
  FROM "User"
)
UPDATE "User" u SET username = CASE WHEN f.n = 1 THEN f.h ELSE left(f.h, 15) || '_' || substr(u.id, 1, 4) END
FROM fixed f WHERE u.id = f.id AND u.username <> CASE WHEN f.n = 1 THEN f.h ELSE left(f.h, 15) || '_' || substr(u.id, 1, 4) END;

-- the application enforces the shape; the database guarantees case-insensitive uniqueness no matter who writes
ALTER TABLE "User" ADD CONSTRAINT "User_username_lower_chk" CHECK (username = lower(username));
