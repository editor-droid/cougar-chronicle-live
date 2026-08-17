-- Separate Campus and Politics email (and push) preferences.
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "wantsCampus" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "wantsPolitics" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "wantsCampus" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS "wantsPolitics" BOOLEAN NOT NULL DEFAULT true;
