-- CreateTable
CREATE TABLE "VideoFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoFavorite_userId_createdAt_idx" ON "VideoFavorite"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoFavorite_userId_videoId_key" ON "VideoFavorite"("userId", "videoId");

-- AddForeignKey
ALTER TABLE "VideoFavorite" ADD CONSTRAINT "VideoFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoFavorite" ADD CONSTRAINT "VideoFavorite_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
