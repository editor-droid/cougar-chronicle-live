import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { Pool } from 'pg';

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
    )
      v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnv();

function slugify(title) {
  const base = String(title || 'post')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'post';
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const empty = await pool.query(`
  SELECT id, title, slug, state, "isPremium", "printEditionId"
  FROM "Post"
  WHERE slug IS NULL OR trim(slug) = ''
  ORDER BY "updatedAt" DESC
`);

console.log('Empty slugs:', empty.rows.length);
for (const r of empty.rows) {
  console.log(r);
}

for (const r of empty.rows) {
  let base = slugify(r.title);
  let slug = base;
  let n = 0;
  while (true) {
    const exists = await pool.query(
      `SELECT id FROM "Post" WHERE slug = $1 AND id <> $2`,
      [slug, r.id]
    );
    if (exists.rows.length === 0) break;
    n += 1;
    slug = `${base}-${n}`;
  }
  await pool.query(`UPDATE "Post" SET slug = $1 WHERE id = $2`, [slug, r.id]);
  console.log(`FIXED: "${r.title}" → /${slug}`);
}

await pool.end();
