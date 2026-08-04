import { z } from 'zod';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  classifyAiError,
  generateStructured,
  stripHtmlForPrompt,
} from '@/lib/ai';
import { slugifyTitle, assessSlug } from '@/lib/slug';

export const maxDuration = 30;

const slugSchema = z.object({
  slug: z
    .string()
    .describe(
      'SEO URL slug: 4–8 hyphenated lowercase words, entities first (byu, provo, names), no stop words, no dates unless essential.'
    ),
  rationale: z
    .string()
    .optional()
    .describe('One short sentence: why this slug ranks well for the story.'),
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
      return NextResponse.json({ error: 'Missing title or content' }, { status: 400 });
    }

    const fallback = slugifyTitle(title || 'untitled', { dropStopWords: true });
    const cleanContent = content ? stripHtmlForPrompt(content, 2000) : '';

    try {
      const object = await generateStructured({
        schema: slugSchema,
        prompt: `You write SEO URL slugs for The Cougar Chronicle (BYU / Provo independent conservative student news).

Hard rules for the slug field:
1. lowercase a-z and hyphens only (no underscores, apostrophes, years unless critical)
2. 4–8 words max; aim under 60 characters
3. Lead with the strongest searchable entities (BYU, Provo, person name, bill, event)
4. Drop filler: a, the, and, of, to, in, for, with, on, is, was, as
5. Prefer concrete nouns over vague phrases (not "what-you-need-to-know")
6. No site name, no "cougar-chronicle", no "article", no "blog"
7. Distinctive — not just "byu-news" or "faith-article"

Headline: ${title || 'Untitled'}

Article excerpt:
${cleanContent || '(no body yet — use headline only)'}
`,
        maxRetries: 2,
      });

      const slug = slugifyTitle(object.slug || fallback, { dropStopWords: true }) || fallback;
      const quality = assessSlug(slug);
      return NextResponse.json({
        slug,
        quality,
        rationale: object.rationale || null,
      });
    } catch (err) {
      console.error('Slug AI failed, using local slugify:', err);
      const slug = fallback;
      return NextResponse.json({
        slug,
        quality: assessSlug(slug),
        rationale: null,
        fallback: true,
      });
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
