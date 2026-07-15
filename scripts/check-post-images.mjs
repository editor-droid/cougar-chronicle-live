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
    )
      v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnv();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function head(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return `${r.status} ${r.headers.get('content-type') || ''}`;
  } catch (e) {
    return `ERR ${e.cause?.code || e.message}`;
  }
}

const post = await prisma.post.findFirst({
  where: { state: 'PUBLISHED' },
  orderBy: { publishedAt: 'desc' },
  select: { title: true, slug: true, imageUrl: true, content: true },
});

console.log('TITLE', post.title);
console.log('HERO', post.imageUrl);
console.log('HERO HEAD', await head(post.imageUrl));

const html = post.content || '';
const imgs = [...html.matchAll(/src=["']([^"']+)["']/gi)].map((m) => m[1]);
console.log('BODY IMG COUNT', imgs.length);
const hosts = {};
for (const s of imgs) {
  try {
    const u = new URL(s, 'https://thecougarchronicle.com');
    hosts[u.host] = (hosts[u.host] || 0) + 1;
  } catch {
    hosts['?'] = (hosts['?'] || 0) + 1;
  }
}
console.log('HOSTS', hosts);

for (const src of imgs.slice(0, 12)) {
  console.log('---');
  console.log(src);
  console.log(await head(src));
}

// show img tag snippets for width/height styles
const tags = [...html.matchAll(/<img[^>]+>/gi)].slice(0, 5);
for (const t of tags) console.log('TAG', t[0].slice(0, 200));

await prisma.$disconnect();
await pool.end();
