'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatLiveStatus } from '@/lib/scores/format';
import { gameHref } from '@/lib/scores/paths';
import { pickLiveGame } from '@/lib/scores/coverage';
import { listGames } from '@/lib/scores/stories';
import type { ByuScoresPayload } from '@/lib/scores/types';

type LiveStrip = { href: string; label: string };

/**
 * Homepage only. Renders nothing unless a BYU game is live, including while
 * the scores request is still in flight.
 */
export default function LiveScoreBar() {
  const [strip, setStrip] = useState<LiveStrip | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const response = await fetch('/api/scores', { cache: 'no-store' });
        if (!response.ok) throw new Error('scores unavailable');
        const json = await response.json() as ByuScoresPayload & { show?: boolean; revalidateSeconds?: number };
        if (cancelled) return;
        const live = json.show === false ? null : pickLiveGame(listGames(json));
        if (!live) {
          setStrip(null);
        } else {
          const { game } = live;
          setStrip({
            href: gameHref(live.sport, game.id),
            label: `Live · BYU ${game.byuScore ?? '–'} · ${game.opponentAbbrev} ${game.opponentScore ?? '–'} · ${formatLiveStatus(game, live.sport)}`,
          });
        }
        const seconds = typeof json.revalidateSeconds === 'number' ? json.revalidateSeconds : 60;
        timer = setTimeout(load, Math.min(Math.max(seconds, 30), 20 * 60) * 1000);
      } catch {
        if (!cancelled) setStrip(null);
      }
    }

    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!strip) return null;
  return (
    <Link href={strip.href} className="live-score-bar">
      <span className="byu-scores__dot" aria-hidden="true" />
      {strip.label}
    </Link>
  );
}
