-- Per-article toggle for donate blurbs (default on).
ALTER TABLE "Post" ADD COLUMN "showDonateCta" BOOLEAN NOT NULL DEFAULT true;
