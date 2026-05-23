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
  let needsReviewPosts: any[] = [];
  let posts: any[] = [];
  let publishedPosts: any[] = [];

  if (isEditorOrAdmin) {
    needsReviewPosts = await prisma.post.findMany({
      where: { state: 'IN_REVIEW' },
      orderBy: { updatedAt: 'desc' },
      include: { author: true }
    });
    posts = await prisma.post.findMany({
      where: { state: { in: ['DRAFT', 'APPROVED'] } },
      orderBy: { updatedAt: 'desc' },
      include: { author: true }
    });
    publishedPosts = await prisma.post.findMany({
      where: { state: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      include: { author: true }
    });
  } else {
    posts = await prisma.post.findMany({
      where: { authorId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      include: { 
        author: true,
        editorialNotes: { where: { resolved: false } }
      }
    });
  }

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2rem' }}>
          <h1 className="font-serif" style={{ fontSize: '2.5rem' }}>
            {isEditorOrAdmin ? 'Editorial Dashboard' : 'Writer Dashboard'}
          </h1>
          {(role === 'ADMIN' || role === 'EDITOR') && (
            <nav style={{ display: 'flex', gap: '1rem' }}>
              <span className="font-sans" style={{ fontWeight: 600, borderBottom: '2px solid var(--foreground)' }}>Posts</span>
              {role === 'ADMIN' && (
                <Link href="/dashboard/users" className="text-muted hover:text-foreground font-sans">Users</Link>
              )}
              <Link href="/dashboard/print-editions" className="text-muted hover:text-foreground font-sans">Print Editions</Link>
            </nav>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span className="text-muted font-sans" style={{ alignSelf: 'center' }}>Logged in as {session.user.name || session.user.email} ({role})</span>
          <Link href="/dashboard/editor/new" className="btn btn-primary font-sans">New Draft</Link>
        </div>
      </header>

      {isEditorOrAdmin && needsReviewPosts.length > 0 && (
        <div style={{ marginBottom: '3rem' }}>
          <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--accent)' }}>Needs Review Queue</h2>
          <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '2px solid var(--accent)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">TITLE</th>
                  <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">AUTHOR</th>
                  <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">SUBMITTED</th>
                  <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {needsReviewPosts.map(post => (
                  <tr key={post.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }} className="font-serif">
                      <Link href={`/dashboard/editor/${post.id}`} style={{ fontWeight: 'bold' }}>{post.title}</Link>
                    </td>
                    <td style={{ padding: '1rem' }} className="font-sans text-sm">{post.author.name}</td>
                    <td style={{ padding: '1rem' }} className="font-sans text-sm text-muted">
                      {new Date(post.updatedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Link href={`/dashboard/editor/${post.id}`} className="btn btn-primary text-sm" style={{ padding: '0.25rem 0.5rem' }}>Review Draft</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{isEditorOrAdmin ? 'All Drafts & Approvals' : 'Your Drafts'}</h2>
        <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">TITLE</th>
                <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">STATUS</th>
                <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">LAST MODIFIED</th>
                <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center' }} className="text-muted font-sans">No drafts found.</td>
                </tr>
              ) : (
                posts.map(post => (
                  <tr key={post.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }} className="font-serif">
                      <Link href={`/dashboard/editor/${post.id}`} style={{ fontWeight: 'bold' }}>{post.title}</Link>
                      {!isEditorOrAdmin && post.editorialNotes?.length > 0 && (
                        <span style={{ marginLeft: '1rem', padding: '0.1rem 0.4rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          {post.editorialNotes.length} Note(s)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '1rem', 
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: post.state === 'APPROVED' ? '#dcfce7' : 'var(--surface-hover)',
                        color: post.state === 'APPROVED' ? '#166534' : 'var(--muted)'
                      }}>
                        {post.state}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }} className="font-sans text-sm text-muted">
                      {new Date(post.updatedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/dashboard/editor/${post.id}`} className="btn btn-secondary text-sm" style={{ padding: '0.25rem 0.5rem' }}>Edit</Link>
                      {/* Server Action Form */}
                      <form action={updatePostState} style={{ display: 'inline-block' }}>
                        <input type="hidden" name="postId" value={post.id} />
                        {isEditorOrAdmin && post.state === 'APPROVED' && (
                          <>
                            <input type="hidden" name="newState" value="PUBLISHED" />
                            <button type="submit" className="btn btn-primary text-sm" style={{ padding: '0.25rem 0.5rem', backgroundColor: 'green', color: 'white' }}>Publish</button>
                          </>
                        )}
                        {!isEditorOrAdmin && post.state === 'DRAFT' && (
                          <>
                            <input type="hidden" name="newState" value="IN_REVIEW" />
                            <button type="submit" className="btn btn-primary text-sm" style={{ padding: '0.25rem 0.5rem' }}>Submit for Review</button>
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

      {isEditorOrAdmin && publishedPosts.length > 0 && (
        <div style={{ marginTop: '3rem', marginBottom: '3rem' }}>
          <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>Published Posts</h2>
          <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">TITLE</th>
                  <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">AUTHOR</th>
                  <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">PUBLISHED</th>
                  <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">VIEWS</th>
                  <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {publishedPosts.map(post => (
                  <tr key={post.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }} className="font-serif">
                      <Link href={`/dashboard/editor/${post.id}`} style={{ fontWeight: 'bold' }}>{post.title}</Link>
                    </td>
                    <td style={{ padding: '1rem' }} className="font-sans text-sm">{post.author.name}</td>
                    <td style={{ padding: '1rem' }} className="font-sans text-sm text-muted">
                      {new Date(post.publishedAt || post.updatedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="font-sans" style={{ fontWeight: 'bold', color: 'var(--primary)', padding: '0.2rem 0.5rem', backgroundColor: 'var(--surface-hover)', borderRadius: '0.25rem' }}>
                        {post.views}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/article/${post.slug}`} className="btn btn-secondary text-sm" style={{ padding: '0.25rem 0.5rem' }}>View Live</Link>
                      <Link href={`/dashboard/editor/${post.id}`} className="btn btn-primary text-sm" style={{ padding: '0.25rem 0.5rem' }}>Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
