const fs = require('fs');

const utilities = `
/* --- Ported Tailwind Utilities for Editor & SEO Panel --- */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-wrap { flex-wrap: wrap; }
.items-center { align-items: center; }
.items-start { align-items: flex-start; }
.items-end { align-items: flex-end; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }
.justify-end { justify-content: flex-end; }
.gap-0\\.5 { gap: 0.125rem; }
.gap-1 { gap: 0.25rem; }
.gap-1\\.5 { gap: 0.375rem; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.gap-4 { gap: 1rem; }
.flex-shrink-0 { flex-shrink: 0; }
.flex-1 { flex: 1 1 0%; }
.w-full { width: 100%; }
.w-px { width: 1px; }
.h-full { height: 100%; }
.h-4 { height: 1rem; }
.h-5 { height: 1.25rem; }
.h-1\\.5 { height: 0.375rem; }
.p-1 { padding: 0.25rem; }
.p-1\\.5 { padding: 0.375rem; }
.p-2 { padding: 0.5rem; }
.p-3 { padding: 0.75rem; }
.p-4 { padding: 1rem; }
.px-1\\.5 { padding-left: 0.375rem; padding-right: 0.375rem; }
.px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
.px-2\\.5 { padding-left: 0.625rem; padding-right: 0.625rem; }
.px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
.pb-4 { padding-bottom: 1rem; }
.pt-3 { padding-top: 0.75rem; }
.mt-0\\.5 { margin-top: 0.125rem; }
.mt-1 { margin-top: 0.25rem; }
.mb-1 { margin-bottom: 0.25rem; }
.mx-0\\.5 { margin-left: 0.125rem; margin-right: 0.125rem; }
.mx-1 { margin-left: 0.25rem; margin-right: 0.25rem; }
.space-y-1\\.5 > * + * { margin-top: 0.375rem; }
.space-y-2 > * + * { margin-top: 0.5rem; }
.space-y-3 > * + * { margin-top: 0.75rem; }
.space-y-4 > * + * { margin-top: 1rem; }
.rounded { border-radius: 0.25rem; }
.rounded-md { border-radius: 0.375rem; }
.rounded-lg { border-radius: 0.5rem; }
.rounded-xl { border-radius: 0.75rem; }
.rounded-full { border-radius: 9999px; }
.border { border-width: 1px; border-style: solid; border-color: var(--border, #E5E3D8); }
.border-t { border-top-width: 1px; border-top-style: solid; border-color: var(--border, #E5E3D8); }
.border-b { border-bottom-width: 1px; border-bottom-style: solid; border-color: var(--border, #E5E3D8); }
.overflow-hidden { overflow: hidden; }
.overflow-y-auto { overflow-y: auto; }
.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-left { text-align: left; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.uppercase { text-transform: uppercase; }
.tracking-wider { letter-spacing: 0.05em; }
.transition-colors { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.duration-500 { transition-duration: 500ms; }
.block { display: block; }
.inline-block { display: inline-block; }
.relative { position: relative; }
.absolute { position: absolute; }
.top-full { top: 100%; }
.left-0 { left: 0; }
.z-50 { z-index: 50; }
.min-w-\\[160px\\] { min-width: 160px; }
.hover\\:bg-\\[var\\(--surface\\)\\]:hover { background-color: var(--surface); }
.grid { display: grid; }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.divide-x > * + * { border-left-width: 1px; border-color: var(--border); }
.animate-spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;

let globalsCss = fs.readFileSync('src/app/globals.css', 'utf8');
if (!globalsCss.includes('/* --- Ported Tailwind Utilities for Editor & SEO Panel --- */')) {
  fs.writeFileSync('src/app/globals.css', globalsCss + '\n' + utilities);
  console.log('Utilities added.');
} else {
  console.log('Utilities already exist.');
}
