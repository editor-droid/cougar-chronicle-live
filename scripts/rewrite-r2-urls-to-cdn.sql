-- One-time: point stored media at the R2 custom domain (cdn) instead of pub-*.r2.dev
-- Run against production Postgres after cdn.thecougarchronicle.com is Active on the R2 bucket.
-- Safe to re-run (only replaces the old host).

-- Adjust OLD host if your bucket used a different pub- URL:
--   SELECT DISTINCT substring(image_url from 'https://pub-[^/]+') FROM ...

BEGIN;

UPDATE "Post"
SET
  "imageUrl" = replace(
    "imageUrl",
    'https://pub-7540640451dd48c6af04cad9907c1784.r2.dev',
    'https://cdn.thecougarchronicle.com'
  )
WHERE "imageUrl" LIKE '%pub-7540640451dd48c6af04cad9907c1784.r2.dev%';

UPDATE "Post"
SET
  content = replace(
    content,
    'https://pub-7540640451dd48c6af04cad9907c1784.r2.dev',
    'https://cdn.thecougarchronicle.com'
  )
WHERE content LIKE '%pub-7540640451dd48c6af04cad9907c1784.r2.dev%';

UPDATE "Video"
SET
  "thumbnailUrl" = replace(
    "thumbnailUrl",
    'https://pub-7540640451dd48c6af04cad9907c1784.r2.dev',
    'https://cdn.thecougarchronicle.com'
  )
WHERE "thumbnailUrl" LIKE '%pub-7540640451dd48c6af04cad9907c1784.r2.dev%';

UPDATE "PrintEdition"
SET
  "coverImageUrl" = replace(
    "coverImageUrl",
    'https://pub-7540640451dd48c6af04cad9907c1784.r2.dev',
    'https://cdn.thecougarchronicle.com'
  ),
  "pdfUrl" = replace(
    "pdfUrl",
    'https://pub-7540640451dd48c6af04cad9907c1784.r2.dev',
    'https://cdn.thecougarchronicle.com'
  )
WHERE
  "coverImageUrl" LIKE '%pub-7540640451dd48c6af04cad9907c1784.r2.dev%'
  OR "pdfUrl" LIKE '%pub-7540640451dd48c6af04cad9907c1784.r2.dev%';

COMMIT;
