import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { updatePostState } from './actions';
import { getArticleUrl } from '@/lib/routes';
import DashboardHeader from '@/components/DashboardHeader';

export default async function DashboardPage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role === 'USER') {
    redirect('/account');
  }

  const role = session.user.role;
  const isEditorOrAdmin = role === 'EDITOR' || role === 'ADMIN';

  // Parse search and pagination params
  const pageParam = searchParams?.page;
  const pageNumber = parseInt(typeof pageParam === 'string' ? pageParam : '1') || 1;
  const pageSize = 20;
  const skip = (pageNumber - 1) * pageSize;
  const queryParam = searchParams?.q;
  const query = typeof queryParam === 'string' ? queryParam : '';
  
  // Validate sort column
  const validSortCols = ['title', 'publishedAt', 'views'];
  const sortParam = searchParams?.sort;
  const sortCol = typeof sortParam === 'string' && validSortCols.includes(sortParam) ? sortParam : 'publishedAt';
  const orderParam = searchParams?.order;
  const sortOrder = orderParam === 'asc' ? 'asc' : 'desc';

  // Fetch posts based on role
  let needsReviewPosts: any[] = [];
  let posts: any[] = [];
  let publishedPosts: any[] = [];
  let totalPublishedPages = 1;

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

    const publishedWhere: any = {
      state: 'PUBLISHED',
      ...(query ? {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { customAuthor: { contains: query, mode: 'insensitive' } }
        ]
      } : {})
    };

    const publishedCount = await prisma.post.count({ where: publishedWhere });
    totalPublishedPages = Math.ceil(publishedCount / pageSize) || 1;

    publishedPosts = await prisma.post.findMany({
      where: publishedWhere,
      orderBy: { [sortCol]: sortOrder },
      take: pageSize,
      skip,
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
      <DashboardHeader currentTab="posts" />

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
                    <td style={{ padding: '1rem' }} className="font-sans text-sm"><Link href={`/author/${post.authorId}`} style={{textDecoration: 'none', color: 'inherit'}}>{post.customAuthor || post.author.name}</Link></td>
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

      {isEditorOrAdmin && (
        <div style={{ marginTop: '3rem', marginBottom: '3rem' }}>
          <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>Published Posts</h2>
          
          <form method="GET" action="/dashboard" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <input type="hidden" name="sort" value={sortCol} />
            <input type="hidden" name="order" value={sortOrder} />
            <input 
              type="text" 
              name="q" 
              defaultValue={query} 
              placeholder="Search published articles..." 
              style={{ flex: 1, minWidth: '250px', padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
            />
            <button type="submit" className="btn btn-primary text-sm" style={{ padding: '0.5rem 1.5rem' }}>Search</button>
            {query && <Link href={`/dashboard?sort=${sortCol}&order=${sortOrder}`} className="btn btn-secondary text-sm" style={{ padding: '0.5rem 1.5rem' }}>Clear</Link>}
          </form>

          <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">
                    <Link href={`/dashboard?q=${encodeURIComponent(query)}&sort=title&order=${sortCol === 'title' && sortOrder === 'asc' ? 'desc' : 'asc'}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      TITLE {sortCol === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Link>
                  </th>
                  <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">
                    AUTHOR
                  </th>
                  <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">
                    <Link href={`/dashboard?q=${encodeURIComponent(query)}&sort=publishedAt&order=${sortCol === 'publishedAt' && sortOrder === 'asc' ? 'desc' : 'asc'}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      PUBLISHED {sortCol === 'publishedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Link>
                  </th>
                  <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">
                    <Link href={`/dashboard?q=${encodeURIComponent(query)}&sort=views&order=${sortCol === 'views' && sortOrder === 'asc' ? 'desc' : 'asc'}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      VIEWS {sortCol === 'views' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </Link>
                  </th>
                  <th style={{ padding: '1rem' }} className="font-sans text-sm text-muted">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {publishedPosts.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }} className="text-muted font-sans">No published posts found.</td>
                  </tr>
                ) : (
                  publishedPosts.map(post => (
                    <tr key={post.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '1rem' }} className="font-serif">
                        <Link href={`/dashboard/editor/${post.id}`} style={{ fontWeight: 'bold' }}>{post.title}</Link>
                      </td>
                      <td style={{ padding: '1rem' }} className="font-sans text-sm"><Link href={`/author/${post.authorId}`} style={{textDecoration: 'none', color: 'inherit'}}>{post.customAuthor || post.author.name}</Link></td>
                      <td style={{ padding: '1rem' }} className="font-sans text-sm text-muted">
                        {new Date(post.publishedAt || post.updatedAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span className="font-sans" style={{ fontWeight: 'bold', color: 'var(--primary)', padding: '0.2rem 0.5rem', backgroundColor: 'var(--surface-hover)', borderRadius: '0.25rem' }}>
                          {post.views}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <Link href={getArticleUrl(post)} className="btn btn-secondary text-sm" style={{ padding: '0.25rem 0.5rem' }}>View Live</Link>
                        <Link href={`/dashboard/editor/${post.id}`} className="btn btn-primary text-sm" style={{ padding: '0.25rem 0.5rem' }}>Edit</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {totalPublishedPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
              {pageNumber > 1 ? (
                <Link href={`/dashboard?page=${pageNumber - 1}&q=${encodeURIComponent(query)}&sort=${sortCol}&order=${sortOrder}`} className="btn btn-secondary text-sm">
                  &larr; Previous
                </Link>
              ) : (
                <span className="btn btn-secondary text-sm" style={{ opacity: 0.5, pointerEvents: 'none' }}>&larr; Previous</span>
              )}
              
              <span className="font-sans text-sm text-muted">Page {pageNumber} of {totalPublishedPages}</span>
              
              {pageNumber < totalPublishedPages ? (
                <Link href={`/dashboard?page=${pageNumber + 1}&q=${encodeURIComponent(query)}&sort=${sortCol}&order=${sortOrder}`} className="btn btn-secondary text-sm">
                  Next &rarr;
                </Link>
              ) : (
                <span className="btn btn-secondary text-sm" style={{ opacity: 0.5, pointerEvents: 'none' }}>Next &rarr;</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
