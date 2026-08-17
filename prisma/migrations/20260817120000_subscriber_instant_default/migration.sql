-- New subscribers get per-article email by default (matches site copy).
ALTER TABLE "Subscriber" ALTER COLUMN "wantsInstant" SET DEFAULT true;

-- Existing list signed up expecting emails; digest cron was not firing.
UPDATE "Subscriber" SET "wantsInstant" = true WHERE "isActive" = true;
