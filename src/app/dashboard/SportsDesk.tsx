import Link from 'next/link';
import { formatDenver, formatPlace } from '@/lib/scores/format';
import { coverageForGames, type CoverageStory } from '@/lib/scores/coverage';
import { getByuScores } from '@/lib/scores/get-byu-scores';
import { gameHref } from '@/lib/scores/paths';
import { listGames } from '@/lib/scores/stories';
import prisma from '@/lib/prisma';

export default async function SportsDesk() {
  try {
    const payload = await getByuScores();
    if (!payload) {
      return (
        <section className="dash-section">
          <div className="dash-card">
            <h2 className="dash-section-title">Sports</h2>
            <p className="font-sans text-sm text-muted">Scores are temporarily unavailable.</p>
          </div>
        </section>
      );
    }

    const games = listGames(payload);
    const now = Date.now();
    const ids = games.map((item) => item.game.id);
    const since = new Date(now - 21 * 24 * 60 * 60 * 1000);
    const posts = ids.length === 0 ? [] : await prisma.post.findMany({
      where: {
        OR: [
          { espnEventId: { in: ids } },
          { autoRecapEventId: { in: ids } },
          { state: 'PUBLISHED', category: 'sports', publishedAt: { gte: since } },
        ],
      },
      select: {
        id: true,
        title: true,
        state: true,
        publishedAt: true,
        espnEventId: true,
        autoRecapEventId: true,
      },
    });
    const stories: CoverageStory[] = posts
      .filter((post): post is typeof post & { state: CoverageStory['state'] } => (
        post.state === 'PUBLISHED' || post.state === 'DRAFT' || post.state === 'IN_REVIEW' || post.state === 'APPROVED'
      ))
      .map((post) => ({
        id: post.id,
        title: post.title,
        publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
        espnEventId: post.espnEventId || post.autoRecapEventId,
        state: post.state,
      }));
    const rows = coverageForGames(games, stories, now);
    const upcoming = rows.filter((row) => row.game.state !== 'post');
    const gaps = rows.filter((row) => row.missingPreview || row.missingRecap);

    return (
      <section className="dash-section">
        <div className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-section-title">Sports</h2>
          </div>
          {upcoming.length === 0 ? (
            <p className="font-sans text-sm text-muted">No BYU game today or in the next three weeks.</p>
          ) : (
            <ul className="sports-desk-list">
              {upcoming.map((row) => {
                const when = formatDenver(row.game.start);
                return (
                  <li key={row.game.id}>
                    <Link href={gameHref(row.sport, row.game.id)}>
                      {row.sportLabel}: {formatPlace(row.game)}
                    </Link>
                    <span>{row.game.state === 'in' ? 'Live' : `${when.date} · ${when.time}`}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <h3 className="font-sans" style={{ margin: '1rem 0 0.4rem', fontSize: '0.85rem' }}>Missing preview or recap</h3>
          {gaps.length === 0 ? (
            <p className="font-sans text-sm text-muted">Recent and upcoming games have a preview or recap.</p>
          ) : (
            <ul className="sports-desk-list">
              {gaps.map((row) => (
                <li key={`gap-${row.game.id}`}>
                  <span>{row.sportLabel}: {formatPlace(row.game)}</span>
                  <span>
                    {row.missingPreview ? 'Needs preview' : ''}
                    {row.missingPreview && row.missingRecap ? ' · ' : ''}
                    {row.missingRecap ? 'Needs recap' : ''}
                    {row.draftId ? (
                      <>
                        {' · '}
                        <Link href={`/dashboard/editor/${row.draftId}`}>Draft started</Link>
                      </>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    );
  } catch (error) {
    console.error('[sports-desk]', error instanceof Error ? error.message : 'error');
    return null;
  }
}
