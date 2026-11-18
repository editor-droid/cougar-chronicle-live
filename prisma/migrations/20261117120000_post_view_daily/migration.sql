-- Additive daily view counts for "Most read today".
-- Does not alter existing columns or rows.

-- CreateTable
CREATE TABLE "PostViewDaily" (
    "postId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PostViewDaily_pkey" PRIMARY KEY ("postId","date")
);

-- CreateIndex
CREATE INDEX "PostViewDaily_date_count_idx" ON "PostViewDaily"("date", "count" DESC);

-- AddForeignKey
ALTER TABLE "PostViewDaily" ADD CONSTRAINT "PostViewDaily_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
