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

    if (!content) {
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    // Strip HTML for the prompt to save tokens and improve understanding
    const cleanContent = content.replace(/<[^>]*>?/gm, ' ');

    const result = await generateObject({
      model: google('gemini-3.5-flash'),
      schema: z.object({
        seoTitle: z.string().describe('An SEO-optimized title for the article, max 60 characters.'),
        seoDescription: z.string().describe('An engaging meta description for search engines, max 155 characters.'),
        seoKeywords: z.string().describe('A comma-separated list of 3-5 highly relevant SEO keywords.'),
        featuredImageAlt: z.string().describe('A descriptive, accessibility-friendly alt text for the featured image based on the context of the article.'),
      }),
      prompt: `You are an expert SEO specialist with 20 years of experience in digital publishing. 
      Analyze the following article draft and generate perfectly optimized SEO metadata to maximize click-through rates on Google search results and social media.

      Current Headline: ${title || 'Untitled'}
      
      Article Content:
      ${cleanContent.substring(0, 5000)}
      `,
    });

    return NextResponse.json(result.object);

  } catch (error) {
    console.error('SEO Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate SEO data' }, { status: 500 });
  }
}
