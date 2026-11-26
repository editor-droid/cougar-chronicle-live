import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TeamView from '@/components/sports/TeamView';
import { getByuScores } from '@/lib/scores/get-byu-scores';
import { getSeasonSnapshot, getStandings, sportBlock } from '@/lib/scores/page-data';
import { isSportKey, SPORT_SPECS, teamHref } from '@/lib/scores/paths';
import { siteOrigin, teamSeoDescription, teamSeoTitle } from '@/lib/scores/seo';
import { sportStories } from '@/lib/scores/story-query';

export const revalidate = 120;

export async function generateMetadata(
  { params }: { params: Promise<{ sport: string }> },
): Promise<Metadata> {
  const { sport } = await params;
  if (!isSportKey(sport)) return { title: 'Sports' };
  const label = SPORT_SPECS[sport].label;
  const title = teamSeoTitle(label);
  const description = teamSeoDescription(label);
  const path = teamHref(sport);
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

export default async function TeamPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = await params;
  if (!isSportKey(sport)) notFound();

  const payload = await getByuScores();
  const block = payload ? sportBlock(payload, sport) : null;
  if (!block) notFound();

  const [table, season, stories] = await Promise.all([
    getStandings(sport),
    getSeasonSnapshot(sport, block.seasonYear),
    sportStories(sport, [...new Set(block.games.map((game) => game.opponent))]),
  ]);

  return (
    <div className="container" style={{ marginTop: '2rem', marginBottom: '3rem' }}>
      <TeamView sport={block} table={table} season={season} stories={stories} />
    </div>
  );
}
