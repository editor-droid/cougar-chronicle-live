-- Game-day alerts. Additive and safe to run more than once.
-- Railway prerenders before migrations. Pages must not query these tables at build time.

CREATE TABLE IF NOT EXISTS "SportsAlertEmail" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SportsAlertEmail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SportsAlertEmail_email_key" ON "SportsAlertEmail"("email");

CREATE TABLE IF NOT EXISTS "SportsAlertEmailSport" (
    "emailId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    CONSTRAINT "SportsAlertEmailSport_pkey" PRIMARY KEY ("emailId", "sport")
);

CREATE TABLE IF NOT EXISTS "SportsAlertPush" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SportsAlertPush_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SportsAlertPush_endpoint_key" ON "SportsAlertPush"("endpoint");

CREATE TABLE IF NOT EXISTS "SportsAlertPushSport" (
    "pushId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    CONSTRAINT "SportsAlertPushSport_pkey" PRIMARY KEY ("pushId", "sport")
);

CREATE TABLE IF NOT EXISTS "SportsAlertSend" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SportsAlertSend_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SportsAlertSend_eventId_kind_channel_recipientId_key"
    ON "SportsAlertSend"("eventId", "kind", "channel", "recipientId");

CREATE INDEX IF NOT EXISTS "SportsAlertSend_eventId_kind_idx"
    ON "SportsAlertSend"("eventId", "kind");

DO $$ BEGIN
  ALTER TABLE "SportsAlertEmailSport"
    ADD CONSTRAINT "SportsAlertEmailSport_emailId_fkey"
    FOREIGN KEY ("emailId") REFERENCES "SportsAlertEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SportsAlertPushSport"
    ADD CONSTRAINT "SportsAlertPushSport_pushId_fkey"
    FOREIGN KEY ("pushId") REFERENCES "SportsAlertPush"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
