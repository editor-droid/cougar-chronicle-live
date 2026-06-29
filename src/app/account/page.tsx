import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { toggleNewsletter } from './actions';
import { getArticleUrl } from '@/lib/routes';

export const metadata = {
  title: 'My Account',
  description: 'Manage your account and view your purchased articles.',
  openGraph: {
    title: 'My Account | The Cougar Chronicle',
    description: 'Manage your account and view your purchased articles.',
    images: [{ url: '/default-og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Account | The Cougar Chronicle',
    description: 'Manage your account and view your purchased articles.',
    images: ['/default-og.png'],
  },
};

export default async function AccountPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  const email = session.user.email as string;

  // 1. Get subscriber status
  const subscriber = await prisma.subscriber.findUnique({
    where: { email }
  });
  const isSubscribedToEmails = subscriber?.isActive ?? false;

  // 2. Get purchased digital articles via ArticleToken
  const tokens = await prisma.articleToken.findMany({
    where: { email },
    include: { post: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem', maxWidth: '800px', marginBottom: '6rem' }}>
      <header style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="font-serif" style={{ fontSize: '2.5rem' }}>My Account</h1>
        
        {/* Simple Sign Out Button */}
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="btn btn-secondary font-sans text-sm">Sign Out</button>
        </form>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        
        {/* EMAIL PREFERENCES SECTION */}
        <section>
          <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Email Preferences</h2>
          <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 className="font-sans font-bold" style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Newsletter Categories</h3>
              <p className="font-sans text-sm text-muted">Select which types of articles you want to receive in your inbox.</p>
            </div>
            <form action={toggleNewsletter} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" name="wantsNews" defaultChecked={subscriber?.wantsNews ?? true} style={{ width: '1.2rem', height: '1.2rem' }} />
                <span className="font-sans font-medium">Campus & National News</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" name="wantsFaith" defaultChecked={subscriber?.wantsFaith ?? true} style={{ width: '1.2rem', height: '1.2rem' }} />
                <span className="font-sans font-medium">Faith & Religion</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" name="wantsOpinion" defaultChecked={subscriber?.wantsOpinion ?? true} style={{ width: '1.2rem', height: '1.2rem' }} />
                <span className="font-sans font-medium">Opinion & Editorial</span>
              </label>
              
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button type="submit" className="btn btn-primary font-sans text-sm">Save Preferences</button>
              </div>
            </form>
          </div>
        </section>

        {/* PURCHASED ARTICLES SECTION */}
        <section>
          <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>My Premium Articles</h2>
          
          {tokens.length === 0 ? (
            <div style={{ backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '0.5rem', border: '1px solid var(--border)', textAlign: 'center' }}>
              <p className="font-sans text-muted" style={{ marginBottom: '1rem' }}>You haven't purchased any individual premium articles yet.</p>
              <Link href="/category/news" className="btn btn-primary font-sans text-sm">Browse Articles</Link>
            </div>
          ) : (
            <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {tokens.map((t) => (
                  <li key={t.id} style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <Link href={`/api/verify-token?token=${t.token}`} style={{ textDecoration: 'none' }}>
                        <h3 className="font-serif hover:text-primary transition-colors" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                          {t.post.title}
                        </h3>
                      </Link>
                      <p className="font-sans text-sm text-muted">Purchased on {new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Link href={`/api/verify-token?token=${t.token}`} className="btn btn-secondary font-sans text-sm">
                      Read Article &rarr;
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
