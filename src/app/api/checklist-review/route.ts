import { z } from 'zod';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { classifyAiError, generateStructured, stripHtmlForPrompt } from '@/lib/ai';

export const maxDuration = 60;

const checkItem = z.object({
  pass: z.boolean().describe('Whether this checklist item appears complete.'),
  note: z
    .string()
    .describe('One short sentence: why it passed, or what still needs work.'),
});

const reviewSchema = z.object({
  spellcheck: checkItem.describe(
    'Grammar, spelling, typos, awkward phrasing remaining in the draft.'
  ),
  seo: checkItem.describe(
    'SEO title, meta description, keywords, and image alt look filled and useful.'
  ),
  formatting: checkItem.describe(
    'Structure looks professional: paragraphs, headings where useful, not a wall of text or empty shell.'
  ),
  oneWordLinks: checkItem.describe(
    'Hyperlink anchor text is concise (short phrase), not full sentences or raw URLs as the only text.'
  ),
  ready: checkItem.describe(
    'Overall ready for editor review or publish only if the draft is solid and other items largely pass.'
  ),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      content,
      seoTitle,
      seoDescription,
      seoKeywords,
      featuredImageAlt,
    } = body as {
      title?: string;
      content?: string;
      seoTitle?: string;
      seoDescription?: string;
      seoKeywords?: string;
      featuredImageAlt?: string;
    };

    if (!content || content === '<p></p>' || content === '<p>Start writing your story here...</p>') {
      return NextResponse.json({ error: 'Write some content first.' }, { status: 400 });
    }

    const cleanContent = stripHtmlForPrompt(content, 7000);
    // Extract anchor snippets for the model (client also checks links).
    const linkSnippets = Array.from(
      String(content).matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)
    )
      .map((m) => m[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, 25);

    const object = await generateStructured({
      schema: reviewSchema,
      prompt: `You are the managing editor for The Cougar Chronicle (BYU / Provo independent student news).

Review this draft against our pre-publish checklist. Be practical: pass when good enough to publish, fail when something clear still needs fixing. Keep each note under 120 characters.

Headline: ${title || 'Untitled'}

Current SEO fields (may be empty):
- seoTitle: ${seoTitle || '(empty)'}
- seoDescription: ${seoDescription || '(empty)'}
- seoKeywords: ${seoKeywords || '(empty)'}
- featuredImageAlt: ${featuredImageAlt || '(empty)'}

Link anchor texts found in HTML:
${linkSnippets.length ? linkSnippets.map((t, i) => `${i + 1}. "${t}"`).join('\n') : '(no links found)'}

Article body (plain text):
${cleanContent}
`,
    });

    return NextResponse.json({ checks: object });
  } catch (error: unknown) {
    console.error('Checklist review error:', error);
    const classified = classifyAiError(error);
    return NextResponse.json(
      { error: classified.error, details: classified.details },
      { status: classified.status }
    );
  }
}
