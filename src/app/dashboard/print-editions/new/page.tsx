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
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/dashboard/print-editions" className="font-sans text-muted" style={{ textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>
          &larr; Back to Print Editions
        </Link>
        <h1 className="font-serif" style={{ fontSize: '2rem', color: 'var(--primary)' }}>Create New Print Edition</h1>
      </div>
      
      <PrintEditionForm />
    </div>
  );
}
