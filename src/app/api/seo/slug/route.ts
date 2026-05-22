import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, content } = body;

    if (!title && !content) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    const cleanContent = content ? content.replace(/<[^>]*>?/gm, ' ').substring(0, 2000) : '';

    const result = await generateObject({
      model: google('gemini-3.5-flash'),
      schema: z.object({
        slug: z.string().describe('An SEO-optimized URL slug. Must be lowercase, hyphenated, and contain no special characters (e.g., my-awesome-article).'),
      }),
      prompt: `Generate an SEO-optimized URL slug for a news article.
      Current Headline: ${title || 'Untitled'}
      Article Snippet: ${cleanContent}
      `,
    });

    return NextResponse.json(result.object);

  } catch (error) {
    console.error('Slug Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate slug' }, { status: 500 });
  }
}
