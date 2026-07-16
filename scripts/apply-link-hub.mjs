import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { randomBytes } from 'crypto';
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
  'prisma/migrations/20260716120000_link_hub/migration.sql',
  'utf8'
);
try {
  await pool.query(sql);
  console.log('OK: LinkHubItem ready');
} catch (e) {
  if (String(e.message).includes('already exists')) {
    console.log('OK: already exists');
  } else {
    console.error(e);
    process.exit(1);
  }
}

// Seed a few default links if empty
const count = await pool.query(`SELECT COUNT(*)::int AS c FROM "LinkHubItem"`);
if (count.rows[0].c === 0) {
  const defaults = [
    { label: 'Read the Chronicle', url: 'https://thecougarchronicle.com/', emoji: '📰', campaign: 'home' },
    { label: 'Membership', url: 'https://thecougarchronicle.com/membership', emoji: '⭐', campaign: 'membership' },
    { label: 'Videos', url: 'https://thecougarchronicle.com/videos', emoji: '▶️', campaign: 'videos' },
    { label: 'Print Edition', url: 'https://thecougarchronicle.com/print-edition', emoji: '🗞️', campaign: 'print' },
    { label: 'Donate', url: 'https://thecougarchronicle.com/donate', emoji: '💙', campaign: 'donate' },
    { label: 'Contact', url: 'https://thecougarchronicle.com/contact', emoji: '✉️', campaign: 'contact' },
  ];
  let i = 0;
  for (const d of defaults) {
    await pool.query(
      `INSERT INTO "LinkHubItem" (id, label, url, emoji, "showImage", "isActive", "sortOrder", "clickCount", "utmCampaign", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, false, true, $5, 0, $6, NOW(), NOW())`,
      [
        `lh_${randomBytes(12).toString('hex')}`,
        d.label,
        d.url,
        d.emoji,
        i,
        d.campaign,
      ]
    );
    i++;
  }
  console.log('Seeded', defaults.length, 'default links');
}

await pool.end();
