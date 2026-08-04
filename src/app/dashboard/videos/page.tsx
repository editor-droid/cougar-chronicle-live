import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import VideosManager from './VideosManager';
import {
  fetchStreamMinutesByUid,
  refreshStreamMetaForVideos,
} from '@/lib/stream-analytics';

export const dynamic = 'force-dynamic';

export default async function DashboardVideosPage() {
  const session = await auth();
  if (!session?.user || session.user.role === 'USER') {
    redirect('/login');
  }

  const canManage =
    session.user.role === 'ADMIN' ||
    session.user.role === 'EDITOR' ||
    session.user.role === 'WRITER';

  if (!canManage) {
    redirect('/dashboard');
  }

  let videos = await prisma.video.findMany({
    orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
  });

  const streamConfigured = Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN
  );

  // Backfill duration / dimensions from Stream when missing
  if (streamConfigured && videos.some((v) => v.platform === 'STREAM')) {
    await refreshStreamMetaForVideos(videos);
    videos = await prisma.video.findMany({
      orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
    });
  }

  const analytics = streamConfigured
    ? await fetchStreamMinutesByUid()
    : { byUid: {}, error: null as string | null };

  return (
    <div className="container animate-fade-in" style={{ marginTop: '1rem', marginBottom: '3rem' }}>
      <DashboardHeader currentTab="videos" />
      <VideosManager
        streamConfigured={streamConfigured}
        analyticsError={analytics.error}
        initialVideos={videos.map((v) => {
          const streamStats =
            v.platform === 'STREAM' ? analytics.byUid[v.externalId] : undefined;
          return {
            id: v.id,
            title: v.title,
            slug: v.slug,
            description: v.description,
            seoTitle: v.seoTitle,
            seoKeywords: v.seoKeywords,
            platform: v.platform,
            externalId: v.externalId,
            thumbnailUrl: v.thumbnailUrl,
            isActive: v.isActive,
            showOnHome: v.showOnHome,
            showInSidebar: v.showInSidebar,
            publishedAt: v.publishedAt.toISOString(),
            embedUrl: v.embedUrl,
            sourceUrl: v.sourceUrl,
            durationSec: v.durationSec,
            views: v.views,
            minutes7d: streamStats?.minutes7d ?? null,
            minutes30d: streamStats?.minutes30d ?? null,
          };
        })}
      />
    </div>
  );
}
