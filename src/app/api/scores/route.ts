import { NextResponse } from 'next/server';
import { getByuScores } from '@/lib/scores/get-byu-scores';

/**
 * Scores stay off article and section RSC renders so those pages can stay ISR.
 * This handler is the only ESPN caller. 1200s is the quiet-period ceiling;
 * a live or soon game shortens it via the hot cache inside getByuScores.
 */
export const revalidate = 1200;

export async function GET() {
  const payload = await getByuScores();
  if (!payload || (!payload.football && !payload.basketball)) {
    return NextResponse.json({ show: false });
  }

  const seconds = payload.revalidateSeconds;
  return NextResponse.json(
    { show: true, ...payload },
    {
      headers: {
        'Cache-Control': `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 2}`,
      },
    }
  );
}
