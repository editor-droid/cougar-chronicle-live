import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DashboardHeader from '@/components/DashboardHeader';
import Image from 'next/image';

export default async function PrintEditionsAdminPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/dashboard');
  }

  const editions = await prisma.printEdition.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { posts: true } },
    },
  });

  return (
    <div className="container animate-fade-in" style={{ marginTop: '1rem', marginBottom: '3rem' }}>
      <DashboardHeader currentTab="print-editions" title="Print editions" />

      <div className="dash-toolbar" style={{ marginBottom: '1.25rem' }}>
        <p className="font-sans text-muted" style={{ margin: 0, lineHeight: 1.5, maxWidth: '36rem', flex: '1 1 240px' }}>
          Covers, PDFs, and article lineups. Open an edition to manage articles. Purchases live under{' '}
          <strong>Orders</strong>.
        </p>
        <Link href="/dashboard/print-editions/new" className="dash-btn dash-btn-primary">
          + New edition
        </Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.15rem',
        }}
      >
        {editions.map((edition) => (
          <Link
            key={edition.id}
            href={`/dashboard/print-editions/${edition.id}`}
            className="dash-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16 / 10',
                background: 'var(--surface-hover)',
              }}
            >
              {edition.coverImageUrl ? (
                <Image
                  src={edition.coverImageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="font-sans text-muted"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                  }}
                >
                  No cover
                </div>
              )}
              {edition.isActive && (
                <span
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    padding: '0.25rem 0.6rem',
                    background: 'rgba(22, 163, 74, 0.95)',
                    color: 'white',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                >
                  Active
                </span>
              )}
            </div>
            <div style={{ padding: '1.1rem 1.15rem 1.2rem' }}>
              <h2 className="font-serif" style={{ fontSize: '1.25rem', margin: '0 0 0.35rem', lineHeight: 1.25 }}>
                {edition.title}
              </h2>
              <p className="font-sans text-muted" style={{ margin: '0 0 0.85rem', fontSize: '0.9rem' }}>
                {edition._count.posts} article{edition._count.posts === 1 ? '' : 's'}
              </p>
              <span
                className="font-sans"
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--primary)',
                }}
              >
                Manage volume →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {editions.length === 0 && (
        <p className="font-sans text-muted">No print editions yet.</p>
      )}
    </div>
  );
}
