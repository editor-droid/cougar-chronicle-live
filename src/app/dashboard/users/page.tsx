import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { updateUser } from '../actions';
import DashboardHeader from '@/components/DashboardHeader';

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
      <DashboardHeader currentTab="users" title="User Management" />


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
                    <form action={updateUser} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="email" name="email" defaultValue={user.email || ''} placeholder="Email address" style={{ padding: '0.25rem', width: '200px', borderRadius: '0.25rem', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }} />
                      <select name="role" defaultValue={user.role} style={{ padding: '0.25rem', borderRadius: '0.25rem', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
                        <option value="USER">USER</option>
                        <option value="WRITER">WRITER</option>
                        <option value="EDITOR">EDITOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                      <button type="submit" className="btn btn-secondary text-sm" style={{ padding: '0.25rem 0.5rem' }}>Save</button>
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
