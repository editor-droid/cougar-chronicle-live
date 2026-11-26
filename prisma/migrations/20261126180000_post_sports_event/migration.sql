-- Additive sports linking. Nullable columns, safe for existing rows.
-- Railway does not run `prisma migrate deploy` during build; apply this file once.

ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "espnEventId" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "autoRecapEventId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Post_autoRecapEventId_key" ON "Post"("autoRecapEventId");
CREATE INDEX IF NOT EXISTS "Post_espnEventId_idx" ON "Post"("espnEventId");
