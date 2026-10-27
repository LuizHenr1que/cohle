-- Folders of servers in the side rail, kept on the account so web and app agree.
ALTER TABLE "UserPrefs" ADD COLUMN "serverGroups" JSONB NOT NULL DEFAULT '[]';
