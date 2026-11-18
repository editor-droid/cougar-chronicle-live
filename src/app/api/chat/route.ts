import { google } from '@ai-sdk/google';
import { streamText, type ModelMessage } from 'ai';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getArticleUrl } from '@/lib/routes';
import { GEMINI_MODEL } from '@/lib/ai';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import {
  CHAT_MAX_INPUT_CHARS,
  chatMayUseArticlePath,
  isPublicChatArticle,
  publicChatArticleWhere,
} from '@/lib/chat-guard';
export const maxDuration = 30;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limited = rateLimit(`chat:${ip}`, 20, 10 * 60 * 1000);
  if (!limited.success) {
    return new Response('Too many messages. Please try again shortly.', { status: 429 });
  }

  try {
    const { messages, pathname } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response('Bad request', { status: 400 });
    }

    const recent = messages.slice(-12);
    const latest = recent[recent.length - 1] as { content?: unknown } | undefined;
    const latestText = typeof latest?.content === 'string' ? latest.content : '';
    if (latestText.length > CHAT_MAX_INPUT_CHARS) {
      return new Response('Message is too long', { status: 400 });
    }
    const boundedMessages: ModelMessage[] = recent.flatMap((message) => {
      if (!message || typeof message !== 'object') return [];
      const record = message as { role?: unknown; content?: unknown };
      const role = record.role === 'assistant' || record.role === 'system' ? record.role : 'user';
      const content = typeof record.content === 'string' ? record.content.slice(0, CHAT_MAX_INPUT_CHARS) : '';
      return [{ role, content }];
    });

    let currentPageContext = '';
    if (chatMayUseArticlePath(pathname)) {
      const slug = pathname.split('/').pop();
      if (slug) {
        const currentArticle = await prisma.post.findFirst({
          where: { slug, ...publicChatArticleWhere },
          select: { title: true, content: true },
        });
        if (currentArticle) {
          currentPageContext = `\n\n--- CURRENT PAGE CONTEXT ---\nThe user is currently reading this article:\nTitle: ${currentArticle.title}\nContent: ${currentArticle.content?.substring(0, 3000)}\n\nYou should prioritize answering questions based on this article if the question is related to it.`;
        }
      }
    }

    // RAG Logic — public stories only. Premium and print text stays out of the prompt.
    const keywords = latestText.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter((w: string) => w.length > 3);
    
    const articleSelect = {
      title: true,
      content: true,
      createdAt: true,
      category: true,
      slug: true,
      state: true,
      isPremium: true,
      printEditionId: true,
    } satisfies Prisma.PostSelect;

    const keywordOr: Prisma.PostWhereInput[] = keywords.flatMap((word) => [
      { title: { contains: word, mode: 'insensitive' } },
      { content: { contains: word, mode: 'insensitive' } },
    ]);

    // Execute queries in parallel
    const [latestArticles, relevantArticles] = await Promise.all([
      prisma.post.findMany({
        where: publicChatArticleWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: articleSelect,
      }),
      keywords.length > 0
        ? prisma.post.findMany({
            where: { ...publicChatArticleWhere, OR: keywordOr },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: articleSelect,
          })
        : Promise.resolve([]),
    ]);

    // Deduplicate articles. The query already excludes premium and print;
    // this filter is a second gate so paywalled text cannot reach the prompt.
    const combinedArticles = [...latestArticles].filter((article) => isPublicChatArticle(article));
    for (const article of relevantArticles) {
      if (!isPublicChatArticle(article)) continue;
      if (!combinedArticles.find((existing) => existing.slug === article.slug)) {
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
      model: google(GEMINI_MODEL),
      system: systemPrompt,
      messages: boundedMessages,
    });

    if (typeof result.toTextStreamResponse === 'function') {
      return result.toTextStreamResponse();
    }
    const legacy = result as { toDataStreamResponse?: () => Response };
    if (typeof legacy.toDataStreamResponse === 'function') {
      return legacy.toDataStreamResponse();
    }
    return new Response('Something went wrong. Please try again.', { status: 500 });
  } catch (error) {
    console.error('Chat failed', error);
    return new Response('Something went wrong. Please try again.', { status: 500 });
  }
}
