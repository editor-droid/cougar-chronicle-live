import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessDashboard } from "@/lib/roles";
import { rateLimit } from "@/lib/rate-limit";
import {
  parseTweetInput,
  stripScripts,
  tweetTextFromOembedHtml,
} from "@/lib/tweet-embed";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessDashboard(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = rateLimit(`tweet-oembed:${session.user.id}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many embed lookups. Try again in a minute." },
      { status: 429 }
    );
  }

  const raw = new URL(request.url).searchParams.get("url") || "";
  const parsed = parseTweetInput(raw);
  if (!parsed) {
    return NextResponse.json(
      { error: "Paste an X post URL (x.com/…/status/…)." },
      { status: 400 }
    );
  }

  let text = "";
  let authorName = "";

  const oembedSources = [
    parsed.handle
      ? `https://twitter.com/${parsed.handle}/status/${parsed.tweetId}`
      : `https://twitter.com/i/web/status/${parsed.tweetId}`,
    parsed.url,
  ];

  try {
    for (const source of oembedSources) {
      const oembedUrl =
        "https://publish.twitter.com/oembed?omit_script=true&dnt=true&hide_thread=true&align=center&url=" +
        encodeURIComponent(source);
      const res = await fetch(oembedUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "CougarChronicle/1.0 (+https://thecougarchronicle.com)",
        },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        html?: string;
        author_name?: string;
      };
      const html = stripScripts(String(data.html || ""));
      text = tweetTextFromOembedHtml(html);
      authorName = String(data.author_name || "");
      if (text || authorName) break;
    }
  } catch {
    // Fallback HTML is enough for widgets.js on the published article.
  }

  return NextResponse.json({
    url: parsed.url,
    tweetId: parsed.tweetId,
    handle: parsed.handle || "",
    text,
    authorName,
  });
}
