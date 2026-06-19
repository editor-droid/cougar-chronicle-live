import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const result = await generateObject({
      model: google('gemini-3.5-flash'),
      schema: z.object({
        seoTitle: z.string(),
        seoDescription: z.string(),
        seoKeywords: z.string(),
        featuredImageAlt: z.string(),
        keyInsights: z.string()
      }),
      prompt: `Analyze the following article draft and generate perfectly optimized SEO metadata.
      Current Headline: Test Title
      Article Content: This is a test article about something interesting.`,
    });
    console.log("Success:", result.object);
  } catch (error: any) {
    console.error("Error generating object:", error);
    if (error.cause) console.error("Cause:", error.cause);
  }
}

test();
