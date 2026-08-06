-- Topic (category) + content type (format: news | opinion) dual taxonomy
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "format" TEXT NOT NULL DEFAULT 'news';

CREATE INDEX IF NOT EXISTS "Post_category_idx" ON "Post"("category");
CREATE INDEX IF NOT EXISTS "Post_format_idx" ON "Post"("format");
CREATE INDEX IF NOT EXISTS "Post_category_format_idx" ON "Post"("category", "format");
