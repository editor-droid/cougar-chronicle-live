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

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function head(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return `${res.status} ${res.headers.get('content-type') || ''}`;
  } catch (e) {
    return `ERR ${e.message}`;
  }
}

async function main() {
  const posts = await prisma.post.findMany({
    where: { state: 'PUBLISHED' },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: 5,
    select: {
      title: true,
      slug: true,
      imageUrl: true,
      publishedAt: true,
    },
  });

  for (const p of posts) {
    console.log('---');
    console.log(p.title);
    console.log('slug:', p.slug);
    console.log('imageUrl:', p.imageUrl);
    if (p.imageUrl) {
      console.log('  HEAD direct:', await head(p.imageUrl));
      const cdn = p.imageUrl.replace(
        /https?:\/\/pub-[a-f0-9]+\.r2\.dev/i,
        'https://cdn.thecougarchronicle.com'
      );
      if (cdn !== p.imageUrl) {
        console.log('  HEAD as cdn:', await head(cdn));
      }
    }
  }
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
