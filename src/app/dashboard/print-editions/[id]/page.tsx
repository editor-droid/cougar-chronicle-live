import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import PrintEditionForm from '../PrintEditionForm';
import Link from 'next/link';
import EditionArticles from '../EditionArticles';

export default async function EditPrintEditionPage(props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/dashboard');
  }

  const params = await props.params;

  const edition = await prisma.printEdition.findUnique({
    where: { id: params.id },
    include: {
      posts: {
        orderBy: [{ printEditionOrder: 'asc' }, { title: 'asc' }],
        include: { author: { select: { name: true } } },
      },
    },
  });

  if (!edition) {
    redirect('/dashboard/print-editions');
  }

  const assignable = await prisma.post.findMany({
    where: {
      OR: [{ printEditionId: null }, { printEditionId: edition.id }],
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
    select: { id: true, title: true, state: true, category: true, printEditionId: true },
  });

  const availableToAdd = assignable.filter((p) => p.printEditionId !== edition.id);

  const hasPdf = Boolean(edition.pdfUrl);
  const hasCover = Boolean(edition.coverImageUrl);

  return (
    <div className="container animate-fade-in" style={{ marginTop: '1rem', marginBottom: '3rem' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          href="/dashboard/print-editions"
          className="font-sans"
          style={{
            textDecoration: 'none',
            marginBottom: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--muted)',
          }}
        >
          ← Editions
        </Link>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div>
            <h1 className="font-serif" style={{ fontSize: '1.85rem', color: '#1B2253', margin: '0 0 0.25rem' }}>
              {edition.title}
            </h1>
            <p className="font-sans text-muted" style={{ margin: 0, fontSize: '0.95rem' }}>
              Cover, PDF, and article lineup for this print issue
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            <span className={`dash-badge ${edition.isActive ? 'dash-badge-green' : ''}`}>
              {edition.isActive ? 'Active on site' : 'Hidden'}
            </span>
            <span className={`dash-badge ${hasCover ? 'dash-badge-navy' : ''}`}>
              {hasCover ? 'Cover set' : 'No cover'}
            </span>
            <span className={`dash-badge ${hasPdf ? 'dash-badge-navy' : ''}`}>
              {hasPdf ? 'PDF ready' : 'No PDF yet'}
            </span>
            <span className="dash-badge dash-badge-navy">
              {edition.posts.length} article{edition.posts.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      <div className="dash-card" style={{ padding: '0.25rem', marginBottom: '0.5rem' }}>
        <div style={{ padding: '1rem 1.15rem 0.25rem' }}>
          <p
            className="font-sans"
            style={{
              margin: 0,
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#6b7280',
            }}
          >
            Edition settings
          </p>
        </div>
        <PrintEditionForm initialData={edition} />
      </div>

      <EditionArticles
        editionId={edition.id}
        posts={edition.posts.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          state: p.state,
          category: p.category,
          printEditionOrder: p.printEditionOrder,
          authorName: p.author?.name || p.customAuthor || null,
        }))}
        assignable={availableToAdd.map((p) => ({
          id: p.id,
          title: p.title,
          state: p.state,
          category: p.category,
        }))}
      />
    </div>
  );
}
