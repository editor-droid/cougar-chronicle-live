import prisma from '@/lib/prisma';
import { getArticleUrl } from '@/lib/routes';

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const latestPosts = await prisma.post.findMany({
      where: { state: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 10,
      select: { title: true, slug: true, content: true, publishedAt: true, category: true, isPremium: true, printEditionId: true }
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'https://thecougarchronicle.com';

    const formattedPosts = latestPosts.map(post => {
      const url = `${baseUrl}${getArticleUrl(post)}`;
      const excerpt = post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 300) + '...' : '';
      return `- [${post.title}](${url}) (${post.category}) - ${excerpt}`;
    }).join('\n');

    const llmsText = `# The Cougar Chronicle

The Cougar Chronicle is an independent student news organization providing the latest news, opinion, and faith-based articles.

## Overview
- **Name**: The Cougar Chronicle
- **Website**: ${baseUrl}
- **Categories**: News, Faith, Opinion
- **Description**: We cover campus news, local events, student life, and opinion pieces with a dedication to truth and journalistic integrity.

## Latest Articles
${formattedPosts}

## Contact
If you have a story tip, question, or inquiry, you can reach out via the contact form on our website or speak with the Cougar Chronicle AI assistant.
`;

    return new Response(llmsText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    return new Response("Error generating llms.txt", { status: 500 });
  }
}
