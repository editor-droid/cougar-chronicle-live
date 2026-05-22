const fs = require('fs');

const resetCss = `
/* --- Tailwind Button Reset --- */
button, [type='button'], [type='reset'], [type='submit'] {
  -webkit-appearance: button;
  background-color: transparent;
  background-image: none;
  border: none;
  padding: 0;
}
/* Revert btn class to have its own border and padding */
.btn {
  border: none;
  padding: 0.5rem 1rem;
}
.btn-secondary {
  border: 1px solid var(--border);
}
`;

let globalsCss = fs.readFileSync('src/app/globals.css', 'utf8');
if (!globalsCss.includes('/* --- Tailwind Button Reset --- */')) {
  fs.writeFileSync('src/app/globals.css', globalsCss + '\n' + resetCss);
  console.log('Button reset added.');
} else {
  console.log('Button reset already exists.');
}
