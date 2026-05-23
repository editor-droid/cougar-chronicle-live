import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import PrintEditionForm from './PrintEditionForm';
import Link from 'next/link';

export default async function PrintEditionsAdminPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/dashboard');
  }

  const editions = await prisma.printEdition.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { posts: true }
      }
    }
  });

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2rem' }}>
          <h1 className="font-serif" style={{ fontSize: '2.5rem' }}>
            Editorial Dashboard
          </h1>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/dashboard" className="text-muted hover:text-foreground font-sans">Posts</Link>
            {session.user.role === 'ADMIN' && (
              <Link href="/dashboard/users" className="text-muted hover:text-foreground font-sans">Users</Link>
            )}
            <span className="font-sans" style={{ fontWeight: 600, borderBottom: '2px solid var(--foreground)' }}>Print Editions</span>
          </nav>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span className="text-muted font-sans" style={{ alignSelf: 'center' }}>Logged in as {session.user.name || session.user.email} ({session.user.role})</span>
          <Link href="/dashboard/print-editions/new" className="btn btn-primary font-sans">New Edition</Link>
        </div>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 className="font-serif" style={{ fontSize: '2rem', color: 'var(--primary)' }}>Print Editions</h2>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {editions.map(edition => (
          <div key={edition.id} style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
            <div style={{ width: '100px', height: '140px', backgroundColor: '#e9ecef', borderRadius: '0.25rem', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {edition.coverImageUrl ? (
                <img src={edition.coverImageUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>No Cover</span>
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <h2 className="font-serif" style={{ fontSize: '1.5rem', margin: 0 }}>{edition.title}</h2>
                {edition.isActive && (
                  <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#d4edda', color: '#155724', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 'bold' }}>Active</span>
                )}
              </div>
              <p className="font-sans text-muted" style={{ margin: 0 }}>
                {edition._count.posts} Articles Included
              </p>
              <div style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', gap: '1rem' }}>
                <a href={edition.pdfUrl} target="_blank" rel="noopener noreferrer" className="nav-link font-sans text-sm" style={{ fontWeight: 'bold' }}>
                  View PDF
                </a>
                <Link href={`/dashboard/print-editions/${edition.id}`} className="nav-link font-sans text-sm" style={{ fontWeight: 'bold' }}>
                  Edit Edition
                </Link>
              </div>
            </div>
          </div>
        ))}
        {editions.length === 0 && (
          <p className="font-sans text-muted">No print editions have been uploaded yet.</p>
        )}
      </div>
    </div>
  );
}
