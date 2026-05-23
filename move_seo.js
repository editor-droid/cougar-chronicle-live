const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/editor/[id]/EditorForm.tsx', 'utf8');

const startMarker = "<div style={{ backgroundColor: '#f0f9ff', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #bae6fd', marginTop: '2rem' }}>";
const endMarker = "<div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found');
  process.exit(1);
}

const seoBlock = content.slice(startIndex, endIndex);
content = content.slice(0, startIndex) + content.slice(endIndex);

const targetMarker = "{/* SEO ANALYSIS PANEL IN SIDEBAR */}";
const targetIndex = content.indexOf(targetMarker);

if (targetIndex === -1) {
  console.error('Target not found');
  process.exit(1);
}

const formattedSeoBlock = seoBlock
  .replace("marginTop: '2rem'", "marginTop: '0', marginBottom: '2rem'")
  .replace("gridTemplateColumns: '1fr 1fr'", "gridTemplateColumns: '1fr'");

content = content.slice(0, targetIndex) + formattedSeoBlock + '\n      ' + content.slice(targetIndex);

fs.writeFileSync('src/app/dashboard/editor/[id]/EditorForm.tsx', content);
console.log('Done!');
