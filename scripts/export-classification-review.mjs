import { readFileSync, writeFileSync } from 'fs';

const raw = readFileSync('scripts/category-migration-plan.json', 'utf8').replace(/^\uFEFF/, '');
const p = JSON.parse(raw);
const plan = p.plan;

function esc(s) {
  return `"${String(s ?? '').replace(/"/g, '""')}"`;
}

const rows = ['title,slug,oldCategory,newSection,newFormat,reason,state'];
for (const r of plan) {
  rows.push(
    [
      esc(r.title),
      esc(r.slug),
      r.oldCategory,
      r.newSection,
      r.newFormat,
      esc(r.reason),
      r.state,
    ].join(',')
  );
}
writeFileSync('scripts/category-classification-for-kimball.csv', rows.join('\n'), 'utf8');

const bySec = {};
const byFmt = {};
const cross = {};
for (const r of plan) {
  bySec[r.newSection] = (bySec[r.newSection] || 0) + 1;
  byFmt[r.newFormat] = (byFmt[r.newFormat] || 0) + 1;
  const k = `${r.newSection} / ${r.newFormat}`;
  cross[k] = (cross[k] || 0) + 1;
}

let md = `# AI section classification (for Kimball review)\n\n`;
md += `Generated: ${p.generatedAt}\n\nTotal posts: **${plan.length}**\n\n`;
md += `## Counts by new section\n\n`;
for (const [k, v] of Object.entries(bySec).sort((a, b) => b[1] - a[1])) {
  md += `- **${k}**: ${v}\n`;
}
md += `\n## Counts by format\n\n`;
for (const [k, v] of Object.entries(byFmt)) {
  md += `- **${k}**: ${v}\n`;
}
md += `\n## Section × format\n\n`;
for (const [k, v] of Object.entries(cross).sort()) {
  md += `- ${k}: ${v}\n`;
}
md += `\nFull row-by-row list: \`scripts/category-classification-for-kimball.csv\`\n\n`;
md += `Do **not** run \`migrate-sections.mjs --apply\` until this list is approved.\n`;
writeFileSync('docs/AI-CLASSIFICATION-REVIEW.md', md, 'utf8');

console.log('Wrote scripts/category-classification-for-kimball.csv');
console.log('Wrote docs/AI-CLASSIFICATION-REVIEW.md');
console.log('total', plan.length, 'sections', bySec, 'formats', byFmt);
