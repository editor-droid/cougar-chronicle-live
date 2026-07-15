/**
 * Rewrite stored media URLs: pub-*.r2.dev → https://cdn.thecougarchronicle.com
 *
 * Usage (repo root, DATABASE_URL in .env):
 *   node scripts/rewrite-r2-urls-to-cdn.mjs --dry-run
 *   node scripts/rewrite-r2-urls-to-cdn.mjs --apply
 *
 * Only use --apply after CDN returns 200 for a real object:
 *   curl -sI "https://cdn.thecougarchronicle.com/<file-key>"
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

function loadEnv() {
  const p = resolve(process.cwd(), '.env');
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv();

const OLD =
  process.env.LEGACY_R2_PUBLIC_URL ||
  'https://pub-7540640451dd48c6af04cad9907c1784.r2.dev';
const NEW = (
  process.env.CLOUDFLARE_PUBLIC_URL || 'https://cdn.thecougarchronicle.com'
).replace(/\/$/, '');

const apply = process.argv.includes('--apply');
const dryRun = !apply;
const probeKey =
  process.argv.find((a) => a.startsWith('--probe='))?.slice(8) ||
  '1784091135969-temple_square.jpg';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log(`Old host: ${OLD}`);
  console.log(`New host: ${NEW}`);
  console.log(`Mode:     ${dryRun ? 'DRY RUN (no writes)' : 'APPLY'}`);
  console.log('');

  const probeUrl = `${NEW}/${probeKey}`;
  console.log(`Probing CDN: ${probeUrl}`);
  try {
    const res = await fetch(probeUrl, { method: 'HEAD', redirect: 'follow' });
    const ct = res.headers.get('content-type') || '';
    console.log(`CDN HEAD: ${res.status} ${ct}`);
    const looksLikeImage = /^image\//i.test(ct) || res.ok;
    if (!res.ok || !looksLikeImage) {
      console.log(
        '\nCDN is NOT healthy yet (need HTTP 200 + image from R2 custom domain).'
      );
      console.log(
        'Right now DNS for cdn.thecougarchronicle.com must point through Cloudflare R2,'
      );
      console.log(
        'not CNAME → thecougarchronicle.com (Railway). Fix that before --apply.\n'
      );
      if (!dryRun) {
        console.error('Aborting --apply.');
        process.exit(1);
      }
    } else {
      console.log('CDN looks good.\n');
    }
  } catch (e) {
    console.error(`CDN probe failed: ${e.message}`);
    if (!dryRun) {
      console.error('Aborting --apply.');
      process.exit(1);
    }
    console.log('(continuing dry-run counts only)\n');
  }

  const [postImages] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS c FROM "Post" WHERE "imageUrl" LIKE $1`,
    `%${OLD}%`
  );
  const [postContent] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS c FROM "Post" WHERE content LIKE $1`,
    `%${OLD}%`
  );
  const [videos] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS c FROM "Video" WHERE "thumbnailUrl" LIKE $1`,
    `%${OLD}%`
  );
  const [prints] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS c FROM "PrintEdition" WHERE "coverImageUrl" LIKE $1 OR "pdfUrl" LIKE $1`,
    `%${OLD}%`
  );

  console.log('Rows still using old host:');
  console.log(`  Post.imageUrl:        ${postImages.c}`);
  console.log(`  Post.content:         ${postContent.c}`);
  console.log(`  Video.thumbnailUrl:   ${videos.c}`);
  console.log(`  PrintEdition fields:  ${prints.c}`);

  if (dryRun) {
    console.log(
      '\nDry run only. After CDN returns 200 for a real file:\n  node scripts/rewrite-r2-urls-to-cdn.mjs --apply\n'
    );
    return;
  }

  const r1 = await prisma.$executeRawUnsafe(
    `UPDATE "Post" SET "imageUrl" = replace("imageUrl", $1, $2) WHERE "imageUrl" LIKE $3`,
    OLD,
    NEW,
    `%${OLD}%`
  );
  const r2 = await prisma.$executeRawUnsafe(
    `UPDATE "Post" SET content = replace(content, $1, $2) WHERE content LIKE $3`,
    OLD,
    NEW,
    `%${OLD}%`
  );
  const r3 = await prisma.$executeRawUnsafe(
    `UPDATE "Video" SET "thumbnailUrl" = replace("thumbnailUrl", $1, $2) WHERE "thumbnailUrl" LIKE $3`,
    OLD,
    NEW,
    `%${OLD}%`
  );
  const r4 = await prisma.$executeRawUnsafe(
    `UPDATE "PrintEdition" SET
      "coverImageUrl" = replace(coalesce("coverImageUrl", ''), $1, $2),
      "pdfUrl" = replace("pdfUrl", $1, $2)
     WHERE "coverImageUrl" LIKE $3 OR "pdfUrl" LIKE $3`,
    OLD,
    NEW,
    `%${OLD}%`
  );

  console.log('\nUpdated:');
  console.log(`  Post.imageUrl:      ${r1}`);
  console.log(`  Post.content:       ${r2}`);
  console.log(`  Video.thumbnail:    ${r3}`);
  console.log(`  PrintEdition:       ${r4}`);
  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
