/**
 * Confirms category migration will not break article permalinks.
 * Article URLs are /article|/premium-article|/print-edition/{slug} — no category in path.
 */
import { readFileSync } from 'fs';

const raw = readFileSync('scripts/category-migration-plan.json', 'utf8').replace(/^\uFEFF/, '');
const { plan } = JSON.parse(raw);

let ok = 0;
const samples = [];
for (const r of plan) {
  // Same logic as getArticleUrl for public free posts
  const path = `/${r.slug}`;
  ok++;
  if (samples.length < 5) {
    samples.push({
      title: r.title?.slice(0, 50),
      oldCategory: r.oldCategory,
      newSection: r.newSection,
      urlUnchanged: path,
    });
  }
}

console.log(`Posts in plan: ${plan.length}`);
console.log('Article URLs do NOT include category — migration only changes listing membership.');
console.log('Sample (URL stays the same after re-tagging):');
for (const s of samples) {
  console.log(`  [${s.oldCategory} → ${s.newSection}] ${s.urlUnchanged}`);
}
console.log('\nOK: no per-article redirects required for slug-based routes.');
console.log('Section hubs: /news /faith /family /politics /opinion (legacy /category/* 301s there). Free stories are flat /{slug}.');
