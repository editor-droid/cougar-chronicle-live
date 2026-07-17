import { z } from 'zod';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  classifyAiError,
  generateStructured,
  slugifyTitle,
  stripHtmlForPrompt,
} from '@/lib/ai';

export const maxDuration = 30;

const slugSchema = z.object({
  slug: z
    .string()
    .describe(
      'SEO URL slug: lowercase, hyphenated, no special characters (e.g. byu-housing-policy-debate).'
    ),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, content } = body as { title?: string; content?: string };

    if (!title && !content) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    const fallback = slugifyTitle(title || 'untitled');
    const cleanContent = content ? stripHtmlForPrompt(content, 1500) : '';

    try {
      const object = await generateStructured({
        schema: slugSchema,
        prompt: `Generate an SEO-optimized URL slug for a news article on The Cougar Chronicle.
Rules: lowercase only, words separated by single hyphens, no punctuation, max ~8 words, no leading/trailing hyphens.
Current Headline: ${title || 'Untitled'}
Article Snippet: ${cleanContent}
`,
        maxRetries: 1,
      });

      const slug = slugifyTitle(object.slug || fallback);
      return NextResponse.json({ slug: slug || fallback });
    } catch (err) {
      // Never hard-fail slug generation — title slugify is good enough
      console.error('Slug AI failed, using local slugify:', err);
      return NextResponse.json({ slug: fallback });
    }
  } catch (error: unknown) {
    console.error('Slug Generation Error:', error);
    const classified = classifyAiError(error);
    return NextResponse.json(
      { error: classified.error, details: classified.details },
      { status: classified.status }
    );
  }
}
