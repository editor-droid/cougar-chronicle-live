/**
 * Migrate posts from Kimball classification CSV.
 *
 * Rules:
 * 1. If Corrections/Updates is non-empty: "Category, Section"
 *    → category = topic, format = news|opinion (Op-Ed → opinion)
 * 2. Else use newSection → category, newFormat → format
 *
 * Usage: node scripts/migrate-category-format.mjs [--csv path] [--dry]
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
    )
      v = v.slice(1, -1);
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}
loadEnv();

function parseCSVLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',') {
        out.push(cur);
        cur = '';
      } else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function normalizeTopic(raw) {
  let s = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
  if (!s) return 'news';
  if (s === 'family issues' || s === 'family-issues') return 'family';
  if (s === 'campus news') return 'campus';
  if (s.includes('campus')) return 'campus';
  if (s.includes('politic')) return 'politics';
  if (s.includes('family')) return 'family';
  if (s.includes('faith')) return 'faith';
  if (s === 'op-ed' || s === 'oped' || s === 'opinon' || s.includes('opinion'))
    return 'opinion';
  if (s.includes('news')) return 'news';
  return s.replace(/\s+/g, '-');
}

function normalizeFormat(raw) {
  const s = String(raw || '')
    .toLowerCase()
    .trim();
  if (
    !s ||
    s === 'news' ||
    s.includes('news')
  ) {
    // careful: "Campus News" as whole string without comma handled elsewhere
    if (s.includes('opinion') || s.includes('op-ed') || s.includes('oped'))
      return 'opinion';
    return 'news';
  }
  if (
    s === 'opinion' ||
    s === 'op-ed' ||
    s === 'oped' ||
    s === 'opinon' ||
    s.includes('opinion') ||
    s.includes('op-ed')
  ) {
    return 'opinion';
  }
  return 'news';
}

/**
 * Parse Corrections/Updates: "Faith, Op-Ed" | "Campus News" | "campus, news"
 */
function parseCorrection(raw) {
  const t = String(raw || '').trim();
  if (!t) return null;

  // "Campus News" without comma
  if (!t.includes(',')) {
    const lower = t.toLowerCase();
    if (lower.includes('campus') && lower.includes('news')) {
      return { category: 'campus', format: 'news' };
    }
    if (lower.includes('campus') && (lower.includes('opinion') || lower.includes('op-ed'))) {
      return { category: 'campus', format: 'opinion' };
    }
    // single token — treat as category, default format news
    return { category: normalizeTopic(t), format: 'news' };
  }

  const parts = t.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) {
    return { category: normalizeTopic(parts[0] || 'news'), format: 'news' };
  }
  return {
    category: normalizeTopic(parts[0]),
    format: normalizeFormat(parts[1]),
  };
}

const dry = process.argv.includes('--dry');
const csvArg = process.argv.find((a) => a.startsWith('--csv='));
const csvPath = csvArg
  ? csvArg.slice('--csv='.length)
  : resolve(
      process.env.USERPROFILE || process.env.HOME || '',
      'Downloads',
      'Existing Article Classification for Migration - category-classification-for-kimball.csv'
    );

if (!existsSync(csvPath)) {
  console.error('CSV not found:', csvPath);
  process.exit(1);
}

const lines = readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean);
const header = parseCSVLine(lines[0]);
const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));

const required = ['slug', 'newSection', 'newFormat'];
for (const r of required) {
  if (idx[r] == null) {
    console.error('Missing column', r, header);
    process.exit(1);
  }
}
const corrKey = header.find((h) => /correct/i.test(h));
const corrIdx = corrKey != null ? idx[corrKey] : -1;

const plans = [];
for (const line of lines.slice(1)) {
  const row = parseCSVLine(line);
  const slug = (row[idx.slug] || '').trim();
  if (!slug) continue;

  const correction = corrIdx >= 0 ? (row[corrIdx] || '').trim() : '';
  let category;
  let format;
  let source;

  const oldCategory = (row[idx.oldCategory] || '').trim();
  const newSection = (row[idx.newSection] || '').trim();
  const newFormat = (row[idx.newFormat] || '').trim();

  if (correction) {
    const parsed = parseCorrection(correction);
    category = parsed.category;
    format = parsed.format;
    source = `correction:${correction}`;
  } else {
    category = normalizeTopic(newSection || 'news');
    format = normalizeFormat(newFormat || 'news');

    // Print-edition bucket is not a public topic hub
    if (
      category === 'print-edition' ||
      category === 'print' ||
      /^print/i.test(newSection)
    ) {
      const oldIsOpinion = /opinion/i.test(oldCategory);
      format = oldIsOpinion ? 'opinion' : normalizeFormat(newFormat || 'news');
      // Keep general news topic unless old category was a known topic
      const oldTopic = normalizeTopic(oldCategory);
      category = ['campus', 'politics', 'family', 'faith', 'news'].includes(oldTopic)
        ? oldTopic
        : 'news';
      if (oldIsOpinion) format = 'opinion';
    }

    // Legacy category Opinion (capital O) with blank corrections
    if (/^opinion$/i.test(oldCategory)) {
      format = 'opinion';
      if (!['campus', 'politics', 'family', 'faith'].includes(category)) {
        category = 'news';
      }
    }

    // newSection=opinion means format aggregate in old plan
    if (normalizeTopic(newSection) === 'opinion') {
      format = 'opinion';
      if (!['campus', 'politics', 'family', 'faith', 'news'].includes(category) || category === 'opinion') {
        category = 'news';
      }
    }

    source = `csv:${newSection}/${newFormat}`;
  }

  if (!['news', 'campus', 'politics', 'family', 'faith'].includes(category)) {
    // Drop legacy "opinion" as a topic — use news + format=opinion
    if (category === 'opinion') {
      category = 'news';
      format = 'opinion';
    } else {
      category = 'news';
    }
  }
  if (format !== 'news' && format !== 'opinion') format = 'news';

  plans.push({ slug, category, format, source });
}

console.log('plans', plans.length);
console.log('by category', tally(plans.map((p) => p.category)));
console.log('by format', tally(plans.map((p) => p.format)));
console.log(
  'sample corrections',
  plans.filter((p) => p.source.startsWith('correction:')).slice(0, 8)
);

function tally(arr) {
  const o = {};
  for (const x of arr) o[x] = (o[x] || 0) + 1;
  return o;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

let updated = 0;
let missing = 0;
const missingSlugs = [];

for (const plan of plans) {
  const post = await prisma.post.findUnique({
    where: { slug: plan.slug },
    select: { id: true, category: true, format: true, title: true },
  });
  if (!post) {
    missing++;
    if (missingSlugs.length < 15) missingSlugs.push(plan.slug);
    continue;
  }
  if (post.category === plan.category && post.format === plan.format) {
    continue;
  }
  if (dry) {
    console.log(
      'DRY',
      plan.slug,
      `${post.category}/${post.format}`,
      '→',
      `${plan.category}/${plan.format}`,
      plan.source
    );
  } else {
    await prisma.post.update({
      where: { id: post.id },
      data: { category: plan.category, format: plan.format },
    });
  }
  updated++;
}

// Backfill any published posts not in CSV: if category was opinion, set format=opinion
const orphans = await prisma.post.findMany({
  where: {
    OR: [{ category: 'opinion' }, { format: { notIn: ['news', 'opinion'] } }],
  },
  select: { id: true, slug: true, category: true, format: true },
});
let orphanFixes = 0;
for (const p of orphans) {
  const data = {};
  if (p.category === 'opinion' && p.format !== 'opinion') {
    data.format = 'opinion';
  }
  if (p.format !== 'news' && p.format !== 'opinion') {
    data.format = p.category === 'opinion' ? 'opinion' : 'news';
  }
  if (Object.keys(data).length === 0) continue;
  if (!dry) {
    await prisma.post.update({ where: { id: p.id }, data });
  }
  orphanFixes++;
}

console.log({ updated, missing, missingSlugs, orphanFixes, dry });

await prisma.$disconnect();
await pool.end();
