import { readFileSync, existsSync, writeFileSync } from 'fs';
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

const cats = await pool.query(`
  SELECT category, state, COUNT(*)::int AS c
  FROM "Post"
  GROUP BY 1, 2
  ORDER BY 1, 2
`);
console.log('BY CATEGORY + STATE');
console.table(cats.rows);

const all = await pool.query(`
  SELECT id, title, slug, category, state,
    "isAmerica250", "isPremium",
    ("printEditionId" IS NOT NULL) AS in_print,
    "publishedAt", "createdAt"
  FROM "Post"
  ORDER BY category, "createdAt" DESC
`);

const POLITICS_RE =
  /\b(trump|biden|congress|senate|house|election|vote|voting|campaign|republican|democrat|gop|white house|scotus|supreme court|legislation|bill |governor|mayor|council|political|politics|capitol|midterm|primary|ballot|immigra|border|tariff|executive order|presidency|presidential)\b/i;
const FAMILY_RE =
  /\b(family|parent|mother|father|marriage|children|child |kids|home|domestic|dating|gender|sexual|porn|abort|pregnancy|fertility|motherhood|fatherhood)\b/i;
const FAITH_RE =
  /\b(church|lds|latter-day|latter day|temple|missionary|gospel|scripture|faith|religion|religious|byu devotion|general conference|prophet|apostle|bishop|stake|ward |jesus|christ|pray|spiritual|theology|doctrine|restoration)\b/i;
const CAMPUS_RE =
  /\b(byu|campus|proctor|honor code|y mountain|cougar|provo|student|class|professor|faculty|university|ncaa|football|basketball|athletic)\b/i;

function suggest(row) {
  const t = row.title || '';
  if (row.in_print) {
    return { section: 'print-edition', format: row.category === 'opinion' ? 'opinion' : 'news', reason: 'has printEditionId' };
  }
  if (row.category === 'faith') {
    return { section: 'faith', format: 'news', reason: 'was category=faith' };
  }
  if (row.category === 'opinion') {
    // Op-eds: pick desk by topic
    if (FAITH_RE.test(t)) return { section: 'faith', format: 'opinion', reason: 'opinion + faith keywords' };
    if (FAMILY_RE.test(t)) return { section: 'family', format: 'opinion', reason: 'opinion + family keywords' };
    if (POLITICS_RE.test(t) || !CAMPUS_RE.test(t)) {
      return { section: 'politics', format: 'opinion', reason: 'opinion + politics/general' };
    }
    return { section: 'news', format: 'opinion', reason: 'opinion + campus-ish' };
  }
  // news or other
  if (FAITH_RE.test(t) && !POLITICS_RE.test(t)) {
    return { section: 'faith', format: 'news', reason: 'news + faith keywords' };
  }
  if (FAMILY_RE.test(t) && !POLITICS_RE.test(t)) {
    return { section: 'family', format: 'news', reason: 'news + family keywords' };
  }
  if (POLITICS_RE.test(t) && !CAMPUS_RE.test(t)) {
    return { section: 'politics', format: 'news', reason: 'news + politics keywords' };
  }
  if (POLITICS_RE.test(t) && CAMPUS_RE.test(t)) {
    return { section: 'politics', format: 'news', reason: 'campus+politics → politics' };
  }
  return { section: 'news', format: 'news', reason: 'default campus/news desk' };
}

const plan = all.rows.map((r) => {
  const s = suggest(r);
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    oldCategory: r.category,
    state: r.state,
    isAmerica250: r.isAmerica250,
    inPrint: r.in_print,
    newSection: s.section,
    newFormat: s.format,
    reason: s.reason,
  };
});

const summary = {};
for (const p of plan) {
  const k = `${p.oldCategory} → ${p.newSection}/${p.newFormat}`;
  summary[k] = (summary[k] || 0) + 1;
}
console.log('\nMIGRATION SUMMARY');
console.table(
  Object.entries(summary)
    .sort((a, b) => b[1] - a[1])
    .map(([map, c]) => ({ map, c }))
);

const byNew = {};
for (const p of plan) {
  byNew[p.newSection] = byNew[p.newSection] || { news: 0, opinion: 0 };
  byNew[p.newSection][p.newFormat]++;
}
console.log('\nBY NEW SECTION');
console.table(
  Object.entries(byNew).map(([section, v]) => ({
    section,
    news: v.news,
    opinion: v.opinion,
    total: v.news + v.opinion,
  }))
);

writeFileSync(
  resolve('scripts/category-migration-plan.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), plan, summary, byNew }, null, 2)
);
console.log('\nWrote scripts/category-migration-plan.json');

// Print full plan compact
for (const p of plan) {
  console.log(
    `[${p.oldCategory}→${p.newSection}/${p.newFormat}] ${p.state} | ${p.title.slice(0, 85)}`
  );
}

await pool.end();
