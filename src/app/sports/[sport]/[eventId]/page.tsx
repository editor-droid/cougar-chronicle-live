import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GameView from '@/components/sports/GameView';
import { getGamePage } from '@/lib/scores/page-data';
import { gameHref, isSportKey } from '@/lib/scores/paths';
import { gameJsonLd, gameSeoDescription, gameSeoTitle, siteOrigin } from '@/lib/scores/seo';
import { linkedStories } from '@/lib/scores/story-query';

export const revalidate = 60;

export async function generateMetadata(
  { params }: { params: Promise<{ sport: string; eventId: string }> },
): Promise<Metadata> {
  const { sport, eventId } = await params;
  if (!isSportKey(sport)) return { title: 'Sports' };
  const page = await getGamePage(sport, eventId);
  if (!page) return { title: 'Game' };
  const title = gameSeoTitle(page.game);
  const description = gameSeoDescription(page.game);
  const path = gameHref(sport, eventId);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | The Cougar Chronicle`,
      description,
      url: `${siteOrigin()}${path}`,
      siteName: 'The Cougar Chronicle',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | The Cougar Chronicle`,
      description,
    },
  };
}

export default async function GamePage(
  { params }: { params: Promise<{ sport: string; eventId: string }> },
) {
  const { sport, eventId } = await params;
  if (!isSportKey(sport) || !/^\d{5,12}$/.test(eventId)) notFound();

  const page = await getGamePage(sport, eventId);
  if (!page) notFound();

  const stories = await linkedStories(page.game);
  const path = gameHref(sport, eventId);
  const jsonLd = gameJsonLd({
    game: page.game,
    url: `${siteOrigin()}${path}`,
    byuRecord: page.summary?.byuRecord ?? page.sport.record,
    opponentRecord: page.summary?.opponentRecord ?? null,
  });

  return (
    <div className="container" style={{ marginTop: '2rem', marginBottom: '3rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <GameView page={page} stories={stories} />
    </div>
  );
}
