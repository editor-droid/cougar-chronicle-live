import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import PrintEditionForm from '../PrintEditionForm';
import Link from 'next/link';

export default async function NewPrintEditionPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {
    redirect('/dashboard');
  }

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem', marginBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/dashboard/print-editions"
          className="font-sans"
          style={{
            textDecoration: 'none',
            marginBottom: '0.85rem',
            display: 'inline-block',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--muted)',
          }}
        >
          ← Editions
        </Link>
        <h1 className="font-serif" style={{ fontSize: '1.85rem', color: 'var(--primary)', margin: 0 }}>
          New print edition
        </h1>
        <p className="font-sans text-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.95rem' }}>
          Add a title, cover, and PDF. You can attach articles after you save.
        </p>
      </div>

      <PrintEditionForm />
    </div>
  );
}
