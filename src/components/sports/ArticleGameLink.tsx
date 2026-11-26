'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatSeoDate } from '@/lib/scores/format';
import { gameHref } from '@/lib/scores/paths';
import { matchupPhrase } from '@/lib/scores/seo';
import { findGameForStory, listGames } from '@/lib/scores/stories';
import type { ByuScoresPayload } from '@/lib/scores/types';

/**
 * Article pages stay off the ESPN fetch. This reads the same cached scores
 * payload the sidebar widget uses, then links the story to a BYU game.
 */
export default function ArticleGameLink({
  title,
  publishedAt,
  espnEventId = null,
}: {
  title: string;
  publishedAt: string | null;
  espnEventId?: string | null;
}) {
  const [href, setHref] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/scores', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((json: (ByuScoresPayload & { show?: boolean }) | null) => {
        if (cancelled || !json || json.show === false) return;
        const hit = findGameForStory(
          { id: 'article', title, publishedAt, espnEventId },
          listGames(json),
        );
        if (!hit) return;
        setHref(gameHref(hit.sport, hit.game.id));
        setLabel(`${matchupPhrase(hit.game)}, ${formatSeoDate(hit.game.start)}`);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [title, publishedAt, espnEventId]);

  if (!href || !label) return null;
  return (
    <p className="article-game-link">
      <Link href={href}>Game: {label}</Link>
    </p>
  );
}
