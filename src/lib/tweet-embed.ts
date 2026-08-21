export type ParsedTweet = {
  url: string;
  tweetId: string;
  handle?: string;
};

export type TweetEmbedAttrs = ParsedTweet & {
  text?: string;
  authorName?: string;
};

const TWEET_HOST = String.raw`(?:www\.|mobile\.)?(?:twitter\.com|x\.com)`;
const TWEET_ID = String.raw`(\d{1,20})`;

/** x.com/handle/status/123 or twitter.com/i/web/status/123 */
const STATUS_RE = new RegExp(
  String.raw`(?:https?:\/\/)?${TWEET_HOST}\/(?:#!\/)?([A-Za-z0-9_]{1,15}|i)\/(?:status|statuses)\/${TWEET_ID}`,
  "i"
);
const I_WEB_STATUS_RE = new RegExp(
  String.raw`(?:https?:\/\/)?${TWEET_HOST}\/i\/web\/status\/${TWEET_ID}`,
  "i"
);
const BARE_STATUS_RE = new RegExp(
  String.raw`https?:\/\/${TWEET_HOST}\/[^"'<\s]+\/status(?:es)?\/${TWEET_ID}`,
  "i"
);

export function canonicalTweetUrl(tweetId: string, handle?: string): string {
  const who = handle && handle.toLowerCase() !== "i" ? handle : "i";
  return `https://x.com/${who}/status/${tweetId}`;
}

export function parseTweetUrl(input: string): ParsedTweet | null {
  const raw = input.trim();
  if (!raw) return null;

  const iWeb = raw.match(I_WEB_STATUS_RE);
  if (iWeb?.[1]) {
    return { url: canonicalTweetUrl(iWeb[1]), tweetId: iWeb[1] };
  }

  const m = raw.match(STATUS_RE);
  if (!m?.[2]) return null;
  const handle = m[1];
  const tweetId = m[2];
  const named = handle && handle.toLowerCase() !== "i" ? handle : undefined;
  return {
    url: canonicalTweetUrl(tweetId, named),
    tweetId,
    handle: named,
  };
}

/** Accept a URL, or Twitter's official embed HTML copied from X. */
export function parseTweetInput(input: string): ParsedTweet | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const fromUrl = parseTweetUrl(trimmed);
  if (fromUrl) return fromUrl;
  const href = trimmed.match(BARE_STATUS_RE);
  if (href?.[0]) return parseTweetUrl(href[0]);
  return null;
}

export function tweetTextFromOembedHtml(html: string): string {
  const m = html.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
  if (!m) return "";
  return decodeBasicEntities(
    m[1]
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function decodeBasicEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function stripScripts(html: string): string {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, "").trim();
}
