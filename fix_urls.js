const fs = require('fs');
const files = [
  'src/app/api/subscribe/route.ts',
  'src/app/dashboard/actions.ts',
  'src/app/layout.tsx',
  'src/app/forgot-password/page.tsx'
];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/https:\/\/cougar-chronicle-live-production-c994\.up\.railway\.app/g, '${process.env.NEXTAUTH_URL || \'http://localhost:3000\'}');
  content = content.replace(/'\$\{process\.env\.NEXTAUTH_URL \|\| 'http:\/\/localhost:3000'\}'/g, '(process.env.NEXTAUTH_URL || \'http://localhost:3000\')');
  fs.writeFileSync(file, content);
});
