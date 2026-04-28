import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { updatePostState } from './actions';

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  const role = session.user.role;
  const isEditorOrAdmin = role === 'EDITOR' || role === 'ADMIN';

  // Fetch posts based on role
  // Writers see their own posts
  // Editors see all DRAFT, IN_REVIEW, APPROVED posts
  const posts = await prisma.post.findMany({
    where: isEditorOrAdmin 
      ? { state: { not: 'PUBLISHED' } } 
      : { authorId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: { author: true }
  });

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2rem' }}>
          <h1 className="font-serif" style={{ fontSize: '2.5rem' }}>
            {isEditorOrAdmin ? 'Editorial Dashboard' : 'Writer Dashboard'}
          </h1>
          {role === 'ADMIN' && (
            <nav style={{ display: 'flex', gap: '1rem' }}>
              <span className="font-sans" style={{ fontWeight: 600, borderBottom: '2px solid var(--foreground)' }}>Posts</span>
              <Link href="/dashboard/users" className="text-muted hover:text-foreground font-sans">Users</Link>
            </nav>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span className="text-muted font-sans" style={{ alignSelf: 'center' }}>Logged in as {session.user.name || session.user.email} ({role})</span>
          <Link href="/dashboard/editor/new" className="btn btn-primary font-sans">New Draft</Link>
        </div>
      </header>

      <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">TITLE</th>
              <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">AUTHOR</th>
              <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">STATUS</th>
              <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">LAST MODIFIED</th>
              <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }} className="text-muted font-sans">No drafts found.</td>
              </tr>
            ) : (
              posts.map(post => (
                <tr key={post.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem' }} className="font-serif">
                    <Link href={`/dashboard/editor/${post.id}`}>{post.title}</Link>
                  </td>
                  <td style={{ padding: '1rem' }} className="font-sans text-sm">{post.author.name}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: post.state === 'IN_REVIEW' ? 'var(--accent)' : 'var(--surface-hover)',
                      color: post.state === 'IN_REVIEW' ? '#fff' : 'var(--muted)'
                    }}>
                      {post.state}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }} className="font-sans text-sm text-muted">
                    {new Date(post.updatedAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {/* Server Action Form */}
                    <form action={updatePostState} style={{ display: 'inline-block' }}>
                      <input type="hidden" name="postId" value={post.id} />
                      {isEditorOrAdmin && post.state === 'IN_REVIEW' && (
                        <>
                          <input type="hidden" name="newState" value="APPROVED" />
                          <button type="submit" className="btn btn-primary text-sm" style={{ padding: '0.25rem 0.5rem' }}>Approve</button>
                        </>
                      )}
                      {isEditorOrAdmin && post.state === 'APPROVED' && (
                        <>
                          <input type="hidden" name="newState" value="PUBLISHED" />
                          <button type="submit" className="btn btn-primary text-sm" style={{ padding: '0.25rem 0.5rem', backgroundColor: 'green' }}>Publish</button>
                        </>
                      )}
                      {!isEditorOrAdmin && post.state === 'DRAFT' && (
                        <>
                          <input type="hidden" name="newState" value="IN_REVIEW" />
                          <button type="submit" className="btn btn-secondary text-sm" style={{ padding: '0.25rem 0.5rem' }}>Submit for Review</button>
                        </>
                      )}
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
