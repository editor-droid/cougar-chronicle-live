import { z } from 'zod';
import { generateStructured } from '@/lib/ai';

export type VideoSeoResult = {
  description: string;
  seoTitle: string;
  seoKeywords: string;
};

/**
 * AI SEO for short Chronicle videos — description, meta title, keywords.
 * Fast model; designed to run automatically on publish when fields are empty.
 */
export async function generateVideoSeo(input: {
  title: string;
  platform?: 'STREAM' | 'YOUTUBE' | string;
  context?: string | null;
}): Promise<VideoSeoResult> {
  const title = input.title.trim() || 'Untitled video';
  const platform =
    input.platform === 'YOUTUBE'
      ? 'YouTube (embedded on The Cougar Chronicle)'
      : input.platform === 'STREAM'
        ? 'Hosted on The Cougar Chronicle (Cloudflare Stream)'
        : 'The Cougar Chronicle video';
  const extra = (input.context || '').trim().slice(0, 800);

  const object = await generateStructured({
    schema: z.object({
      description: z
        .string()
        .describe(
          '1–2 sentence plain-text description for the watch page and meta description. Max 160 characters. No hashtags. Natural, journalistic tone for BYU/campus audience.'
        ),
      seoTitle: z
        .string()
        .describe(
          'SEO title under 60 characters. Can refine the headline slightly for search; keep brand-neutral (no "| The Cougar Chronicle" suffix).'
        ),
      seoKeywords: z
        .string()
        .describe(
          'Comma-separated list of 4–7 keywords/phrases: BYU, campus, topic entities, "Cougar Chronicle" only if natural. No numbering.'
        ),
    }),
    prompt: `You are the SEO editor for The Cougar Chronicle (independent conservative student journalism at BYU: faith, campus news, opinion).

Write SEO metadata for a SHORT VIDEO (not a full article).

Video title: ${title}
Host: ${platform}
${extra ? `Extra context: ${extra}` : 'No extra transcript; infer carefully from the title only. Do not invent specific quotes or false claims.'}

Goals: clear for Google video results and social previews; accurate; scannable; no clickbait. Prefer concrete entities (BYU, Provo, names in the title) over vague filler.`,
  });

  return {
    description: object.description.trim().slice(0, 300),
    seoTitle: object.seoTitle.trim().slice(0, 70),
    seoKeywords: object.seoKeywords
      .trim()
      .replace(/\s*,\s*/g, ', ')
      .slice(0, 300),
  };
}
