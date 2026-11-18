-- Additive editor history and draft preview tokens.
-- Safe to run on its own: new tables and indexes only, no existing rows change.
-- Railway does not run `prisma migrate deploy` during build; apply this file once.

-- CreateTable
CREATE TABLE IF NOT EXISTS "PostRevision" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "excerpt" TEXT,
    "slug" TEXT,
    "category" TEXT,
    "format" TEXT,
    "imageUrl" TEXT,
    "imageCaption" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT,
    "keyInsights" TEXT,
    "featuredImageAlt" TEXT,
    "customAuthor" TEXT,
    "isPremium" BOOLEAN,
    "isAmerica250" BOOLEAN,
    "isBreaking" BOOLEAN,
    "showDonateCta" BOOLEAN,
    "printEditionId" TEXT,
    "printEditionOrder" INTEGER,
    "editorChecklist" TEXT,
    "publishedAt" TIMESTAMP(3),
    "postAuthorId" TEXT,
    "state" TEXT,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PreviewToken" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreviewToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PostRevision_postId_createdAt_idx" ON "PostRevision"("postId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PostRevision_postId_source_createdAt_idx" ON "PostRevision"("postId", "source", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PostRevision_authorId_idx" ON "PostRevision"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PreviewToken_tokenHash_key" ON "PreviewToken"("tokenHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PreviewToken_postId_createdAt_idx" ON "PreviewToken"("postId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PreviewToken_expiresAt_idx" ON "PreviewToken"("expiresAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PostRevision" ADD CONSTRAINT "PostRevision_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PostRevision" ADD CONSTRAINT "PostRevision_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PreviewToken" ADD CONSTRAINT "PreviewToken_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PreviewToken" ADD CONSTRAINT "PreviewToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
