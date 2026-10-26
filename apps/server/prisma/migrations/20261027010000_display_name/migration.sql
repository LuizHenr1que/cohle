-- Optional display name, separate from the unique @username.
ALTER TABLE "User" ADD COLUMN "displayName" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_displayName_len_chk" CHECK ("displayName" IS NULL OR char_length("displayName") BETWEEN 1 AND 32);
