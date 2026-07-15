-- Format tag: news (reportage) vs opinion (op-ed). Section stays in "category".
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "format" TEXT NOT NULL DEFAULT 'news';

-- Normalize legacy casing
UPDATE "Post" SET category = lower(category) WHERE category <> lower(category);

-- Backfill format from legacy opinion category (section migration is a separate script)
UPDATE "Post" SET format = 'opinion' WHERE lower(category) = 'opinion';
