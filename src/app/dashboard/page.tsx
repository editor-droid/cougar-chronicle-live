import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { updatePostState } from './actions';
import { getArticleUrl } from '@/lib/routes';
import DashboardHeader from '@/components/DashboardHeader';

function statusBadgeClass(state: string) {
  if (state === 'PUBLISHED' || state === 'APPROVED') return 'dash-badge dash-badge-green';
  if (state === 'IN_REVIEW') return 'dash-badge dash-badge-amber';
  return 'dash-badge';
}

export default async function DashboardPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
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
  const canPublish = role === 'ADMIN';

  const pageParam = searchParams?.page;
  const pageNumber = parseInt(typeof pageParam === 'string' ? pageParam : '1') || 1;
  const pageSize = 20;
  const skip = (pageNumber - 1) * pageSize;
  const queryParam = searchParams?.q;
  const query = typeof queryParam === 'string' ? queryParam : '';

  const validSortCols = ['title', 'publishedAt', 'views'];
  const sortParam = searchParams?.sort;
  const sortCol =
    typeof sortParam === 'string' && validSortCols.includes(sortParam)
      ? sortParam
      : 'publishedAt';
  const orderParam = searchParams?.order;
  const sortOrder = orderParam === 'asc' ? 'asc' : 'desc';

  let needsReviewPosts: any[] = [];
  let posts: any[] = [];
  let publishedPosts: any[] = [];
  let totalPublishedPages = 1;

  if (isEditorOrAdmin) {
    needsReviewPosts = await prisma.post.findMany({
      where: { state: 'IN_REVIEW' },
      orderBy: { updatedAt: 'desc' },
      include: { author: true },
    });
    posts = await prisma.post.findMany({
      where: { state: { in: ['DRAFT', 'APPROVED'] } },
      orderBy: { updatedAt: 'desc' },
      include: { author: true },
    });

    const publishedWhere: any = {
      state: 'PUBLISHED',
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { customAuthor: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const publishedCount = await prisma.post.count({ where: publishedWhere });
    totalPublishedPages = Math.ceil(publishedCount / pageSize) || 1;

    publishedPosts = await prisma.post.findMany({
      where: publishedWhere,
      orderBy: { [sortCol]: sortOrder },
      take: pageSize,
      skip,
      include: { author: true },
    });
  } else {
    posts = await prisma.post.findMany({
      where: { authorId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        author: true,
        editorialNotes: { where: { resolved: false } },
      },
    });
  }

  const sortHref = (col: string) => {
    const nextOrder = sortCol === col && sortOrder === 'asc' ? 'desc' : 'asc';
    return `/dashboard?q=${encodeURIComponent(query)}&sort=${col}&order=${nextOrder}`;
  };

  return (
    <div className="container animate-fade-in" style={{ marginTop: '1rem', marginBottom: '3rem' }}>
      <DashboardHeader currentTab="posts" />

      {isEditorOrAdmin && needsReviewPosts.length > 0 && (
        <section className="dash-section">
          <div className="dash-card dash-card-accent">
            <div className="dash-card-header">
              <h2 className="dash-section-title">Needs review</h2>
              <span className="dash-badge dash-badge-amber">
                {needsReviewPosts.length} waiting
              </span>
            </div>
            <div className="dashboard-table-scroll">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {needsReviewPosts.map((post) => (
                    <tr key={post.id}>
                      <td>
                        <Link
                          href={`/dashboard/editor/${post.id}`}
                          className="dash-title-link"
                        >
                          {post.title}
                        </Link>
                      </td>
                      <td className="text-muted">
                        {post.customAuthor || post.author.name}
                      </td>
                      <td className="text-muted">
                        {new Date(post.updatedAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="dash-row-actions">
                          <Link
                            href={`/dashboard/editor/${post.id}`}
                            className="dash-btn dash-btn-primary"
                          >
                            Review
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="dash-section">
        <div className="dash-card">
          <div className="dash-card-header">
            <h2 className="dash-section-title">
              {isEditorOrAdmin ? 'Drafts & approvals' : 'Your drafts'}
            </h2>
            <span className="dash-badge dash-badge-navy">{posts.length}</span>
          </div>
          <div className="dashboard-table-scroll">
            {posts.length === 0 ? (
              <div className="dash-empty">No drafts found.</div>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Last modified</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id}>
                      <td>
                        <Link
                          href={`/dashboard/editor/${post.id}`}
                          className="dash-title-link"
                        >
                          {post.title}
                        </Link>
                        {!isEditorOrAdmin && post.editorialNotes?.length > 0 && (
                          <span
                            className="dash-badge dash-badge-red"
                            style={{ marginLeft: '0.5rem' }}
                          >
                            {post.editorialNotes.length} note
                            {post.editorialNotes.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={statusBadgeClass(post.state)}>
                          {post.state}
                        </span>
                      </td>
                      <td className="text-muted">
                        {new Date(post.updatedAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="dash-row-actions">
                          <Link
                            href={`/dashboard/editor/${post.id}`}
                            className="dash-btn"
                          >
                            Edit
                          </Link>
                          <form action={updatePostState} style={{ display: 'inline' }}>
                            <input type="hidden" name="postId" value={post.id} />
                            {canPublish && post.state === 'APPROVED' && (
                              <>
                                <input type="hidden" name="newState" value="PUBLISHED" />
                                <button type="submit" className="dash-btn dash-btn-success">
                                  Publish
                                </button>
                              </>
                            )}
                            {role === 'EDITOR' && post.state === 'IN_REVIEW' && (
                              <>
                                <input type="hidden" name="newState" value="APPROVED" />
                                <button type="submit" className="dash-btn dash-btn-primary">
                                  Approve
                                </button>
                              </>
                            )}
                            {!isEditorOrAdmin && post.state === 'DRAFT' && (
                              <>
                                <input type="hidden" name="newState" value="IN_REVIEW" />
                                <button type="submit" className="dash-btn dash-btn-primary">
                                  Submit
                                </button>
                              </>
                            )}
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {isEditorOrAdmin && (
        <section className="dash-section">
          <div className="dash-card">
            <div className="dash-card-header">
              <h2 className="dash-section-title">Published</h2>
            </div>
            <div style={{ padding: '1rem 1.15rem 0' }}>
              <form method="GET" action="/dashboard" className="dash-toolbar">
                <input type="hidden" name="sort" value={sortCol} />
                <input type="hidden" name="order" value={sortOrder} />
                <div className="dash-search">
                  <input
                    type="search"
                    name="q"
                    defaultValue={query}
                    placeholder="Search published articles…"
                  />
                </div>
                <button type="submit" className="dash-btn dash-btn-primary">
                  Search
                </button>
                {query ? (
                  <Link
                    href={`/dashboard?sort=${sortCol}&order=${sortOrder}`}
                    className="dash-btn"
                  >
                    Clear
                  </Link>
                ) : null}
              </form>
            </div>
            <div className="dashboard-table-scroll">
              {publishedPosts.length === 0 ? (
                <div className="dash-empty">No published posts found.</div>
              ) : (
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>
                        <Link href={sortHref('title')} style={{ color: 'inherit', textDecoration: 'none' }}>
                          Title {sortCol === 'title' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                        </Link>
                      </th>
                      <th>Author</th>
                      <th>
                        <Link href={sortHref('publishedAt')} style={{ color: 'inherit', textDecoration: 'none' }}>
                          Published {sortCol === 'publishedAt' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                        </Link>
                      </th>
                      <th>
                        <Link href={sortHref('views')} style={{ color: 'inherit', textDecoration: 'none' }}>
                          Views {sortCol === 'views' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                        </Link>
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publishedPosts.map((post) => (
                      <tr key={post.id}>
                        <td>
                          <Link
                            href={`/dashboard/editor/${post.id}`}
                            className="dash-title-link"
                          >
                            {post.title}
                          </Link>
                        </td>
                        <td className="text-muted">
                          {post.customAuthor || post.author.name}
                        </td>
                        <td className="text-muted">
                          {new Date(post.publishedAt || post.updatedAt).toLocaleDateString()}
                        </td>
                        <td>
                          <span className="dash-badge dash-badge-navy">{post.views}</span>
                        </td>
                        <td>
                          <div className="dash-row-actions">
                            <Link href={getArticleUrl(post)} className="dash-btn">
                              View
                            </Link>
                            <Link
                              href={`/dashboard/editor/${post.id}`}
                              className="dash-btn dash-btn-primary"
                            >
                              Edit
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {totalPublishedPages > 1 && (
            <div className="dash-pagination">
              {pageNumber > 1 ? (
                <Link
                  href={`/dashboard?page=${pageNumber - 1}&q=${encodeURIComponent(query)}&sort=${sortCol}&order=${sortOrder}`}
                  className="dash-btn"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="dash-btn" style={{ opacity: 0.45, pointerEvents: 'none' }}>
                  ← Previous
                </span>
              )}
              <span className="font-sans text-sm text-muted">
                Page {pageNumber} of {totalPublishedPages}
              </span>
              {pageNumber < totalPublishedPages ? (
                <Link
                  href={`/dashboard?page=${pageNumber + 1}&q=${encodeURIComponent(query)}&sort=${sortCol}&order=${sortOrder}`}
                  className="dash-btn"
                >
                  Next →
                </Link>
              ) : (
                <span className="dash-btn" style={{ opacity: 0.45, pointerEvents: 'none' }}>
                  Next →
                </span>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
