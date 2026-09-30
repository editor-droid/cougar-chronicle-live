-- Drafts desk assignments point at staff accounts, and reminders remember what was sent.
ALTER TABLE "Post" DROP COLUMN IF EXISTS "assignedWriter";
ALTER TABLE "Post" DROP COLUMN IF EXISTS "assignedEditor";

ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "assignedWriterId" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "assignedEditorId" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "deskAssignedAt" TIMESTAMP(3);
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "editorOpenedAt" TIMESTAMP(3);
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "deskNotices" TEXT;

ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_assignedWriterId_fkey";
ALTER TABLE "Post" ADD CONSTRAINT "Post_assignedWriterId_fkey"
  FOREIGN KEY ("assignedWriterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_assignedEditorId_fkey";
ALTER TABLE "Post" ADD CONSTRAINT "Post_assignedEditorId_fkey"
  FOREIGN KEY ("assignedEditorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Post_assignedWriterId_idx" ON "Post"("assignedWriterId");
CREATE INDEX IF NOT EXISTS "Post_assignedEditorId_idx" ON "Post"("assignedEditorId");
