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

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = readFileSync(
  'prisma/migrations/20260715180000_video_favorites/migration.sql',
  'utf8'
);
try {
  await pool.query(sql);
  console.log('OK: VideoFavorite created');
} catch (e) {
  if (String(e.message).includes('already exists')) {
    console.log('OK: already exists');
  } else {
    console.error(e);
    process.exit(1);
  }
}
const r = await pool.query(
  `SELECT to_regclass('public."VideoFavorite"') as t`
);
console.log(r.rows[0]);
await pool.end();
