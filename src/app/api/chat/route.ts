import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import prisma from '@/lib/prisma';
import { getArticleUrl } from '@/lib/routes';
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, pathname } = await req.json();

    let currentPageContext = '';
    if (pathname && (pathname.startsWith('/article/') || pathname.startsWith('/premium-article/'))) {
      const slug = pathname.split('/').pop();
      const currentArticle = await prisma.post.findUnique({
        where: { slug },
        select: { title: true, content: true }
      });
      if (currentArticle) {
        currentPageContext = `\n\n--- CURRENT PAGE CONTEXT ---\nThe user is currently reading this article:\nTitle: ${currentArticle.title}\nContent: ${currentArticle.content?.substring(0, 3000)}\n\nYou should prioritize answering questions based on this article if the question is related to it.`;
      }
    }

    // RAG Logic
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    const keywords = lastUserMessage.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter((w: string) => w.length > 3);
    
    const orConditions = keywords.map((w: string) => ({
      OR: [
        { title: { contains: w, mode: 'insensitive' } },
        { content: { contains: w, mode: 'insensitive' } }
      ]
    }));

    // Execute queries in parallel
    const [latestArticles, relevantArticles] = await Promise.all([
      prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { title: true, content: true, createdAt: true, category: true, slug: true, isPremium: true }
      }),
      keywords.length > 0 ? prisma.post.findMany({
        // @ts-ignore
        where: { OR: orConditions.flatMap(c => c.OR) },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { title: true, content: true, createdAt: true, category: true, slug: true, isPremium: true }
      }) : Promise.resolve([])
    ]);

    // Deduplicate articles
    const combinedArticles = [...latestArticles];
    for (const article of relevantArticles as any[]) {
      if (!combinedArticles.find(a => a.slug === article.slug)) {
        combinedArticles.push(article);
      }
    }

    const formattedArticles = combinedArticles.map(a => `
Title: ${a.title}
Category: ${a.category}
Date: ${a.createdAt.toDateString()}
URL: ${getArticleUrl(a)}
Excerpt: ${a.content ? a.content.substring(0, 1500) : ''}...
`).join('\n---\n');

    const systemPrompt = `You are the Cougar Chronicle AI assistant. 
You answer questions STRICTLY based on the provided articles below. 
You must NEVER use outside knowledge. 
If the user asks for the latest news or today's news, pull from these latest articles. 
If there is no update for today, say there is no update for today but provide the latest articles.
Info should be current and ONLY from the website/database. NOWHERE ELSE!!!!

FORMATTING INSTRUCTIONS:
- Use Markdown for all formatting.
- Use bold and italics naturally to emphasize points.
- If you reference an article, you MUST provide a clickable Markdown link using the URL provided, e.g. [Article Title](URL).
- If the user asks a question you cannot answer with the provided articles, or requests to contact the editor/staff, you MUST output exactly the string "[CONTACT_FORM]" on its own line.

--- LATEST & RELEVANT ARTICLES DATABASE ---
${formattedArticles}
${currentPageContext}
`;

    const result = await streamText({
      model: google('gemini-3.5-flash'),
      system: systemPrompt,
      messages,
    });

    if (typeof result.toTextStreamResponse === 'function') {
      return result.toTextStreamResponse();
    } else {
      return (result as any).toDataStreamResponse();
    }
  } catch (error: any) {
    return new Response(error.message || "Unknown error", { status: 500 });
  }
}
