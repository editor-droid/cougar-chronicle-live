-- CreateTable
CREATE TABLE "LinkHubItem" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "emoji" TEXT,
    "imageUrl" TEXT,
    "showImage" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "utmCampaign" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkHubItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LinkHubItem_isActive_sortOrder_idx" ON "LinkHubItem"("isActive", "sortOrder");

-- Default hub settings (latest story card on)
INSERT INTO "SiteSetting" ("key", "value")
VALUES ('linkHub.showLatestStory', 'true')
ON CONFLICT ("key") DO NOTHING;
