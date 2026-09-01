/**
 * List published/draft posts whose slug still ends with a legacy brand suffix.
 * Read-only — does not update the database.
 *
 *   node scripts/strip-brand-slugs.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { Pool } from 'pg';

const BRAND_SLUG_SUFFIXES = ['-the-coug-chron', '-the-cougar-chronicle'];

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

if (!process.env.DATABASE_URL) {
  console.error('No DATABASE_URL (.env missing or empty). Not querying.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const likeClauses = BRAND_SLUG_SUFFIXES.map((_, i) => `slug LIKE $${i + 1}`);
const params = BRAND_SLUG_SUFFIXES.map((s) => `%${s}`);

const { rows } = await pool.query(
  `
  SELECT id, title, slug, state, "isPremium", "printEditionId"
  FROM "Post"
  WHERE ${likeClauses.join(' OR ')}
  ORDER BY slug
  `,
  params
);

console.log(`Posts whose slug ends with a brand suffix: ${rows.length}`);
for (const r of rows) {
  const kind = r.printEditionId ? 'print' : r.isPremium ? 'premium' : 'free';
  console.log(`${r.state}\t${kind}\t/${r.slug}\t${r.title}`);
}

await pool.end();
