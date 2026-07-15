/**
 * Apply section + format migration plan (from audit-categories.mjs).
 *
 *   node scripts/audit-categories.mjs          # regenerate plan JSON
 *   node scripts/migrate-sections.mjs          # dry-run
 *   node scripts/migrate-sections.mjs --apply  # WRITE production DB
 *
 * Also ensures "format" column exists.
 *
 * Do NOT --apply until team signs off and feature/section-taxonomy is ready to merge.
 */

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

const apply = process.argv.includes('--apply');
const planPath = resolve('scripts/category-migration-plan.json');
if (!existsSync(planPath)) {
  console.error('Missing scripts/category-migration-plan.json — run audit-categories.mjs first');
  process.exit(1);
}

const { plan, summary, byNew } = JSON.parse(readFileSync(planPath, 'utf8'));
console.log('Plan entries:', plan.length);
console.log('Mode:', apply ? 'APPLY' : 'DRY-RUN');
console.log('Summary:', summary);
console.log('By section:', byNew);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Ensure column
await pool.query(`
  ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "format" TEXT NOT NULL DEFAULT 'news';
`);

if (!apply) {
  console.log('\nDry-run only. Sample of first 15 moves:');
  for (const p of plan.slice(0, 15)) {
    console.log(
      `  ${p.oldCategory} → ${p.newSection}/${p.newFormat} | ${p.title.slice(0, 60)}`
    );
  }
  console.log('\nTo write DB: node scripts/migrate-sections.mjs --apply');
  await pool.end();
  process.exit(0);
}

const client = await pool.connect();
try {
  await client.query('BEGIN');
  let n = 0;
  for (const p of plan) {
    await client.query(
      `UPDATE "Post" SET category = $1, format = $2 WHERE id = $3`,
      [p.newSection, p.newFormat, p.id]
    );
    n++;
  }
  await client.query('COMMIT');
  console.log(`Updated ${n} posts.`);
} catch (e) {
  await client.query('ROLLBACK');
  console.error(e);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
