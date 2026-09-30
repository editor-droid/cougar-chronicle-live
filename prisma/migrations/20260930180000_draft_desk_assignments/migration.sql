-- Planning fields for the drafts desk. Free-text names and a target day.
-- They do not change the byline and they do not publish the story.
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "assignedWriter" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "assignedEditor" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "targetPublishDate" TIMESTAMP(3);
