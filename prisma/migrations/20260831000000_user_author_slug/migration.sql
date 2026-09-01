-- Public author URLs: /author/{slug} instead of /author/{cuid}.
-- App generates slugs lazily on first author-page read (ensureAuthorSlug); no backfill.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- Postgres unique indexes allow multiple NULLs, so users without a slug can coexist.
CREATE UNIQUE INDEX IF NOT EXISTS "User_slug_key" ON "User"("slug");
