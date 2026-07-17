/**
 * Shared Gemini helpers for dashboard AI (SEO, slug, spellcheck, video SEO).
 *
 * Why this exists:
 * - generateObject with Gemini fails intermittently (schema mismatches, empty
 *   candidates, free-tier 429s). Callers used to surface a bare "Failed".
 * - We retry, fall back to free-form JSON via generateText, and normalize output.
 */
import { generateObject, generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { z, type ZodTypeAny } from 'zod';

/**
 * Stable production default (Gemini 3.5 Flash).
 * Override with GEMINI_MODEL if needed.
 */
export const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash';

/**
 * Stable alternate if primary is rate-limited or unavailable.
 * Prefer a pinned 2.5 Flash over gemini-flash-latest (alias can change).
 */
const GEMINI_FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL?.trim() || 'gemini-2.5-flash';

export function stripHtmlForPrompt(html: string, maxLen = 6000): string {
  return (html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function extractJsonObject(text: string): unknown {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('Model did not return valid JSON');
  }
}

function isRetryableError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || err || '');
  const status =
    (err as { statusCode?: number; status?: number })?.statusCode ||
    (err as { statusCode?: number; status?: number })?.status;
  if (status === 429 || status === 500 || status === 503) return true;
  return /429|rate limit|quota|timeout|ECONNRESET|fetch failed|overloaded|unavailable|NoObjectGenerated|could not parse|JSON/i.test(
    msg
  );
}

export type GenerateStructuredOptions<T extends ZodTypeAny> = {
  schema: T;
  prompt: string;
  /** Prefer structured first; on failure try free-form JSON. Default true. */
  allowTextFallback?: boolean;
  maxRetries?: number;
};

/**
 * Reliable structured generation: structured mode → retry → other model → text JSON.
 */
export async function generateStructured<T extends ZodTypeAny>(
  options: GenerateStructuredOptions<T>
): Promise<z.infer<T>> {
  const {
    schema,
    prompt,
    allowTextFallback = true,
    maxRetries = 2,
  } = options;

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      'GOOGLE_GENERATIVE_AI_API_KEY is not configured on the server'
    );
  }

  const models = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(
    (m, i, arr) => m && arr.indexOf(m) === i
  );

  let lastError: unknown;

  for (const modelId of models) {
    try {
      const result = await generateObject({
        model: google(modelId),
        schema,
        prompt,
        maxRetries,
        temperature: 0.3,
      });
      return result.object as z.infer<T>;
    } catch (err) {
      lastError = err;
      console.error(`[ai] generateObject failed model=${modelId}`, err);
      if (!isRetryableError(err) && models.indexOf(modelId) === 0) {
        // Still try fallback model for schema parse failures
      }
    }

    if (allowTextFallback) {
      try {
        let shapeHint = '{ ... }';
        try {
          // Zod object schemas expose .shape — helpful for the free-form prompt
          const shape = (schema as unknown as { shape?: Record<string, unknown> })
            .shape;
          if (shape && typeof shape === 'object') {
            shapeHint = JSON.stringify(
              Object.fromEntries(
                Object.keys(shape).map((k) => [k, `<${k}>`])
              )
            );
          }
        } catch {
          /* ignore */
        }

        const { text } = await generateText({
          model: google(modelId),
          prompt: `${prompt}

IMPORTANT: Respond with ONLY a single valid JSON object (no markdown fences, no commentary) matching this shape:
${shapeHint}
Every required key must be present. Use plain strings/arrays only.`,
          maxRetries: 1,
          temperature: 0.2,
        });

        const raw = extractJsonObject(text);
        const parsed = schema.parse(raw);
        return parsed as z.infer<T>;
      } catch (err) {
        lastError = err;
        console.error(`[ai] text JSON fallback failed model=${modelId}`, err);
      }
    }
  }

  const message =
    (lastError as { message?: string })?.message ||
    'AI generation failed after retries';
  throw new Error(message);
}

/** Turn insight bullets into the HTML list KeyTakeaways expects. */
export function insightsToHtml(insights: string[] | string): string {
  if (Array.isArray(insights)) {
    const items = insights
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `<li>${s.replace(/^[-*•]\s*/, '')}</li>`);
    if (!items.length) return '';
    return `<ul>${items.join('')}</ul>`;
  }
  const raw = (insights || '').trim();
  if (!raw) return '';
  if (raw.includes('<ul') || raw.includes('<li')) return raw;
  // Markdown-ish lines → HTML
  const lines = raw
    .split(/\n+/)
    .map((l) => l.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);
  if (lines.length >= 2) {
    return `<ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul>`;
  }
  return raw;
}

export function slugifyTitle(title: string): string {
  return (title || 'untitled')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled';
}

export function classifyAiError(err: unknown): {
  status: number;
  error: string;
  details?: string;
} {
  const msg = String((err as { message?: string })?.message || err || 'Unknown error');
  if (/GOOGLE_GENERATIVE_AI_API_KEY|not configured/i.test(msg)) {
    return {
      status: 503,
      error: 'AI is not configured on the server (missing API key).',
      details: msg,
    };
  }
  if (/429|rate limit|quota/i.test(msg)) {
    return {
      status: 429,
      error: 'AI rate limit hit. Wait a few seconds and try again.',
      details: msg,
    };
  }
  return {
    status: 500,
    error: 'Failed to generate AI content. Please try again.',
    details: msg.slice(0, 400),
  };
}
