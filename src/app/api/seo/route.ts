import { z } from 'zod';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  classifyAiError,
  generateStructured,
  insightsToHtml,
  stripHtmlForPrompt,
} from '@/lib/ai';

export const maxDuration = 60;

const seoSchema = z.object({
  seoTitle: z
    .string()
    .describe('SEO-optimized title, max ~60 characters, no site name suffix.'),
  seoDescription: z
    .string()
    .describe('Engaging meta description for search engines, max ~155 characters.'),
  seoKeywords: z
    .string()
    .describe('Comma-separated list of 3-6 highly relevant SEO keywords/phrases.'),
  featuredImageAlt: z
    .string()
    .describe(
      'Descriptive accessibility alt text for the featured image based on article context.'
    ),
  // Array is far more reliable than asking the model for raw HTML in structured mode
  keyInsights: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe(
      '2–4 concise takeaway bullets (plain text, no HTML, no leading bullets/dashes).'
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

    if (!content || content === '<p></p>') {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    const cleanContent = stripHtmlForPrompt(content, 6000);

    const object = await generateStructured({
      schema: seoSchema,
      prompt: `You are the SEO editor for The Cougar Chronicle (independent conservative student journalism at BYU: faith, campus news, opinion in Provo, Utah).

Analyze this article draft and produce metadata that maximizes clarity and click-through on Google and social — accurate, not clickbait. Prefer concrete entities (BYU, Provo, names, bills) over vague filler.

Current Headline: ${title || 'Untitled'}

Article Content:
${cleanContent}
`,
    });

    return NextResponse.json({
      seoTitle: object.seoTitle.trim().slice(0, 70),
      seoDescription: object.seoDescription.trim().slice(0, 200),
      seoKeywords: object.seoKeywords
        .trim()
        .replace(/\s*,\s*/g, ', ')
        .slice(0, 300),
      featuredImageAlt: object.featuredImageAlt.trim().slice(0, 200),
      keyInsights: insightsToHtml(object.keyInsights),
    });
  } catch (error: unknown) {
    console.error('SEO Generation Error:', error);
    const classified = classifyAiError(error);
    return NextResponse.json(
      { error: classified.error, details: classified.details },
      { status: classified.status }
    );
  }
}
