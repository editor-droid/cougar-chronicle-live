const fs = require('fs');

// 1. Update src/app/article/[slug]/page.tsx
let pageTsx = fs.readFileSync('src/app/article/[slug]/page.tsx', 'utf8');

// Add import
if (!pageTsx.includes("import TableOfContents")) {
  pageTsx = pageTsx.replace(
    "import ClientLightbox from './ClientLightbox';",
    "import ClientLightbox from './ClientLightbox';\nimport TableOfContents, { injectHeadingIds } from '@/components/TableOfContents';"
  );
}

// Inject HTML
if (!pageTsx.includes("const htmlContent = post.content")) {
  pageTsx = pageTsx.replace(
    "{hasAccess ? (",
    "const htmlContent = post.content ? injectHeadingIds(post.content) : '';\n\n          return {hasAccess ? ("
  );
  
  // Actually wait, JSX inside return cannot have variable declaration.
  // We need to inject `const htmlContent` before the return!
}
