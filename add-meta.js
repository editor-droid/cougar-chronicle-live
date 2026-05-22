const fs = require('fs');
const path = require('path');

const pages = [
  { path: 'about/page.tsx', title: 'About Us', description: 'Learn about The Cougar Chronicle, our mission, and our editorial board.' },
  { path: 'donate/page.tsx', title: 'Donate', description: 'Support independent, conservative journalism at BYU.' },
  { path: 'print-edition/page.tsx', title: 'Print Edition', description: 'Where to find physical copies of The Cougar Chronicle on campus.' },
  { path: 'contact/page.tsx', title: 'Contact Us', description: 'Reach out to the editors or submit a tip.' },
  { path: 'login/page.tsx', title: 'Staff Login', description: 'Staff portal login.' },
  { path: 'forgot-password/page.tsx', title: 'Forgot Password', description: 'Reset your password.' },
  { path: 'reset-password/page.tsx', title: 'Reset Password', description: 'Reset your password.' }
];

for (const page of pages) {
  const fullPath = path.join('src', 'app', page.path);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    const importMeta = `import type { Metadata } from 'next';\n\nexport const metadata: Metadata = {\n  title: '${page.title}',\n  description: '${page.description}',\n};\n\n`;
    
    if (!content.includes('export const metadata')) {
      // Find the first line that is not an import
      const lines = content.split('\n');
      let insertIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].startsWith('import ') && lines[i].trim() !== '') {
          insertIdx = i;
          break;
        }
      }
      lines.splice(insertIdx, 0, importMeta);
      fs.writeFileSync(fullPath, lines.join('\n'));
      console.log(`Updated ${page.path}`);
    }
  }
}

// For unsubscribe which is a client component, create a layout.tsx
const unsubLayoutPath = path.join('src', 'app', 'unsubscribe', 'layout.tsx');
if (!fs.existsSync(unsubLayoutPath)) {
  const unsubLayoutContent = `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  description: 'Unsubscribe from The Cougar Chronicle newsletter.',
};

export default function UnsubscribeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
`;
  fs.writeFileSync(unsubLayoutPath, unsubLayoutContent);
  console.log('Created unsubscribe/layout.tsx');
}
