import { z } from 'zod';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  classifyAiError,
  generateStructured,
  stripHtmlForPrompt,
} from '@/lib/ai';

export const maxDuration = 60;

const spellcheckSchema = z.object({
  suggestions: z.array(
    z.object({
      original: z
        .string()
        .describe(
          'Exact original text snippet with the error. Keep short — just the phrase with the error.'
        ),
      suggested: z
        .string()
        .describe('Corrected text to replace the original snippet.'),
      reason: z
        .string()
        .describe('Brief reason (Spelling, Grammar, Punctuation, Clarity).'),
    })
  ),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await req.json();
    if (!content || content === '<p></p>') {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    const cleanContent = stripHtmlForPrompt(content, 10000);

    const object = await generateStructured({
      schema: spellcheckSchema,
      prompt: `You are an expert copy editor for The Cougar Chronicle (student newspaper).
Review the following article text and list spelling, grammar, and punctuation errors only.
Be precise with "original" so it can be used for exact string replacement.
If the text looks clean, return an empty suggestions array.
Do not rewrite style or politics — fix clear errors only.

Text to review:
${cleanContent}
`,
    });

    return NextResponse.json({
      suggestions: (object.suggestions || []).slice(0, 40),
    });
  } catch (error: unknown) {
    console.error('Spellcheck Generation Error:', error);
    const classified = classifyAiError(error);
    return NextResponse.json(
      { error: classified.error, details: classified.details },
      { status: classified.status }
    );
  }
}
