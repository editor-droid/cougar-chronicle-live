const fs = require('fs');

let routeTs = fs.readFileSync('src/app/api/chat/route.ts', 'utf8');

// Replace line 9
routeTs = routeTs.replace(
  "const { messages } = await req.json();",
  "const { messages, pathname } = await req.json();\n\n    let currentPageContext = '';\n    if (pathname && pathname.startsWith('/article/')) {\n      const slug = pathname.split('/').pop();\n      const currentArticle = await prisma.post.findUnique({\n        where: { slug },\n        select: { title: true, content: true }\n      });\n      if (currentArticle) {\n        currentPageContext = `\\n\\n--- CURRENT PAGE CONTEXT ---\\nThe user is currently reading this article:\\nTitle: ${currentArticle.title}\\nContent: ${currentArticle.content?.substring(0, 3000)}\\n\\nYou should prioritize answering questions based on this article if the question is related to it.`;\n      }\n    }"
);

// Append to systemPrompt
routeTs = routeTs.replace(
  "${formattedArticles}\n`;",
  "${formattedArticles}\n${currentPageContext}\n`;"
);

fs.writeFileSync('src/app/api/chat/route.ts', routeTs);
console.log('Updated route.ts');
