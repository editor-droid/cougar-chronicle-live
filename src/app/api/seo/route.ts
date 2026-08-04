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
    .describe(
      'SEO title ~50–60 characters: primary keyword near front, specific, no "| The Cougar Chronicle" suffix, no clickbait.'
    ),
  seoDescription: z
    .string()
    .describe(
      'Meta description ~140–155 characters: one clear sentence + soft CTA, include 1–2 concrete entities (BYU, Provo, names).'
    ),
  seoKeywords: z
    .string()
    .describe(
      'Comma-separated 4–6 keywords/phrases readers would search (include BYU or Provo when relevant).'
    ),
  featuredImageAlt: z
    .string()
    .describe(
      'Accessibility alt text: who/what/where, no "image of", under ~125 characters.'
    ),
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
      prompt: `You are the SEO editor for The Cougar Chronicle (independent conservative student journalism at BYU: faith, campus news, family, politics, opinion in Provo, Utah).

Produce SERP-ready metadata:
- Accurate and specific; never clickbait or sensational.
- Prefer concrete entities (BYU, Provo, Utah, named people, bills, events).
- seoTitle: 50–60 chars ideal; keyword early; no site name suffix.
- seoDescription: 140–155 chars; complete thought; invite the click without hype.
- seoKeywords: real search phrases, not single generic words like "news".
- featuredImageAlt: describe the image content for accessibility.

Current Headline: ${title || 'Untitled'}

Article Content:
${cleanContent}
`,
    });

    const seoTitle = object.seoTitle.trim().slice(0, 70);
    const seoDescription = object.seoDescription.trim().slice(0, 160);
    return NextResponse.json({
      seoTitle,
      seoDescription,
      seoKeywords: object.seoKeywords
        .trim()
        .replace(/\s*,\s*/g, ', ')
        .slice(0, 300),
      featuredImageAlt: object.featuredImageAlt.trim().slice(0, 125),
      keyInsights: insightsToHtml(object.keyInsights),
      quality: {
        titleLen: seoTitle.length,
        descriptionLen: seoDescription.length,
        titleOk: seoTitle.length >= 40 && seoTitle.length <= 60,
        descriptionOk: seoDescription.length >= 120 && seoDescription.length <= 160,
      },
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
