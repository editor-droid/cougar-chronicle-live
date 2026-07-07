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

    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    // Strip HTML for the prompt to save tokens and improve understanding
    const cleanContent = content.replace(/<[^>]*>?/gm, ' ');

    const result = await generateObject({
      model: google('gemini-3.5-flash'),
      schema: z.object({
        suggestions: z.array(z.object({
          original: z.string().describe('The exact original text snippet that has an error. Keep it short, just the phrase with the error.'),
          suggested: z.string().describe('The corrected text to replace the original snippet.'),
          reason: z.string().describe('Explanation of the error (e.g., Spelling, Grammar, Punctuation).')
        }))
      }),
      prompt: `You are an expert editor. Review the following text and find any spelling, grammar, or punctuation errors.
      Provide a list of corrections. Be precise with the "original" field so it can be used for exact string replacement in the text.
      
      Text to review:
      ${cleanContent.substring(0, 10000)}
      `,
    });

    return NextResponse.json(result.object);

  } catch (error: any) {
    console.error('Spellcheck Generation Error:', error);
    
    // Check if it's a rate limit error from the AI provider
    if (error?.statusCode === 429 || error?.message?.includes('429') || error?.message?.includes('quota')) {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. Please try again later or check your API quota.' 
      }, { status: 429 });
    }

    return NextResponse.json({ 
      error: 'Failed to generate spellcheck data',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}
