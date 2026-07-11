import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import VideosManager from './VideosManager';

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

  const videos = await prisma.video.findMany({
    orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
  });

  const streamConfigured = Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN
  );

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      <DashboardHeader currentTab="videos" />
      <VideosManager
        streamConfigured={streamConfigured}
        initialVideos={videos.map((v) => ({
          id: v.id,
          title: v.title,
          slug: v.slug,
          description: v.description,
          seoTitle: v.seoTitle,
          seoKeywords: v.seoKeywords,
          platform: v.platform,
          thumbnailUrl: v.thumbnailUrl,
          isActive: v.isActive,
          showOnHome: v.showOnHome,
          showInSidebar: v.showInSidebar,
          publishedAt: v.publishedAt.toISOString(),
          embedUrl: v.embedUrl,
          sourceUrl: v.sourceUrl,
          durationSec: v.durationSec,
        }))}
      />
    </div>
  );
}
