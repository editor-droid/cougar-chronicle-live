import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { updateUserRole } from '../actions';

export default async function UsersPage() {
  const session = await auth();
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const users = await prisma.user.findMany({
    orderBy: { email: 'asc' }
  });

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2rem' }}>
          <h1 className="font-serif" style={{ fontSize: '2.5rem' }}>
            User Management
          </h1>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/dashboard" className="text-muted hover:text-foreground font-sans">Posts</Link>
            <span className="font-sans" style={{ fontWeight: 600, borderBottom: '2px solid var(--foreground)' }}>Users</span>
          </nav>
        </div>
      </header>

      <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">NAME</th>
              <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">EMAIL</th>
              <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">ROLE</th>
              <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem' }} className="font-sans">{user.name || 'No Name'}</td>
                <td style={{ padding: '1rem' }} className="font-sans text-muted">{user.email}</td>
                <td style={{ padding: '1rem' }} className="font-sans">
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '1rem', 
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: user.role === 'ADMIN' ? 'var(--accent)' : 'var(--surface-hover)',
                    color: user.role === 'ADMIN' ? '#fff' : 'var(--muted)'
                  }}>
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  {user.id !== session.user.id && (
                    <form action={updateUserRole} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input type="hidden" name="userId" value={user.id} />
                      <select name="role" defaultValue={user.role} style={{ padding: '0.25rem', borderRadius: '0.25rem', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
                        <option value="USER">USER</option>
                        <option value="WRITER">WRITER</option>
                        <option value="EDITOR">EDITOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                      <button type="submit" className="btn btn-secondary text-sm" style={{ padding: '0.25rem 0.5rem' }}>Update</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
