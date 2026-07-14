import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { toggleNewsletter } from './actions';
import { getArticleUrl } from '@/lib/routes';
import PushSettings from '@/components/PushSettings';
import MembershipCheckoutButton from '@/components/MembershipCheckoutButton';
import BillingPortalButton from '@/components/BillingPortalButton';
import GiftUnlockButton from '@/components/GiftUnlockButton';

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

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSubscribed: true, giftLinks: true, stripeId: true, role: true },
  });
  const isMember = dbUser?.isSubscribed === true;
  const giftLinks = dbUser?.giftLinks ?? 0;

  // 1. Get subscriber status
  const subscriber = await prisma.subscriber.findUnique({
    where: { email }
  });

  const activeEdition = await prisma.printEdition.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  // Premium posts for gift UI
  const giftablePosts = isMember
    ? await prisma.post.findMany({
        where: { state: 'PUBLISHED', isPremium: true, publishedAt: { lte: new Date() } },
        orderBy: { publishedAt: 'desc' },
        take: 8,
        select: { id: true, title: true },
      })
    : [];

  // 2. Get purchased digital articles via ArticleToken
  const tokens = await prisma.articleToken.findMany({
    where: { email },
    include: { post: true },
    orderBy: { createdAt: 'desc' }
  });

  // 3. Get favorites
  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    include: { post: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="container animate-fade-in" style={{ marginTop: '2rem', maxWidth: '800px', marginBottom: '6rem' }}>
      <header style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="font-serif" style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>My Account</h1>
          <p className="font-sans text-muted text-sm">Signed in as {email}</p>
        </div>
        
        {/* Simple Sign Out Button */}
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="btn btn-secondary font-sans text-sm">Sign Out</button>
        </form>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>

        {/* MEMBERSHIP */}
        <section>
          <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Membership</h2>
          <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            {isMember ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p className="font-sans" style={{ margin: 0 }}>
                  <strong style={{ color: '#15803d' }}>Chronicle Member</strong>
                  <span className="text-muted text-sm"> — full digital access active</span>
                </p>
                <p className="font-sans text-sm text-muted" style={{ margin: 0 }}>
                  Gift unlocks remaining: <strong>{giftLinks}</strong>
                </p>
                {activeEdition?.pdfUrl && (
                  <a href={activeEdition.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary font-sans text-sm" style={{ alignSelf: 'flex-start' }}>
                    Download Print Volume PDF
                  </a>
                )}
                {dbUser?.stripeId && <BillingPortalButton />}
                {giftablePosts.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                    <h3 className="font-sans font-bold" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
                      Share a gift unlock
                    </h3>
                    <p className="font-sans text-sm text-muted" style={{ marginBottom: '0.75rem' }}>
                      Email a friend the unlock, or copy a link for iMessage. Each gift uses one of your unlocks.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {giftablePosts.map((p) => (
                        <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span className="font-serif" style={{ fontSize: '1rem' }}>{p.title}</span>
                          <GiftUnlockButton postId={p.id} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="font-sans text-sm text-muted" style={{ marginBottom: '1rem' }}>
                  Unlock every premium digital story and the annual Print Volume PDF for $48/year.
                </p>
                <MembershipCheckoutButton />
                <p className="font-sans text-xs text-muted" style={{ marginTop: '0.75rem' }}>
                  <a href="/membership" style={{ color: 'var(--primary)' }}>Learn more about membership</a>
                </p>
              </div>
            )}
          </div>
        </section>

        {/* DEVICE PREFERENCES SECTION */}
        <section>
          <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Device Preferences</h2>
          <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 className="font-sans font-bold" style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Push Notifications</h3>
            </div>
            <PushSettings />
          </div>
        </section>
        
        {/* EMAIL PREFERENCES SECTION */}
        <section>
          <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Email Preferences</h2>
          <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 className="font-sans font-bold" style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Newsletter Categories</h3>
              <p className="font-sans text-sm text-muted">Select what you want in your inbox. New subscribers get all categories (including videos) on by default.</p>
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" name="wantsVideos" defaultChecked={subscriber?.wantsVideos ?? true} style={{ width: '1.2rem', height: '1.2rem' }} />
                <span className="font-sans font-medium">New Videos</span>
              </label>
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <p className="font-sans text-sm font-bold" style={{ marginBottom: '0.75rem' }}>How often</p>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                  <input type="checkbox" name="wantsDigest" defaultChecked={subscriber?.wantsDigest ?? true} style={{ width: '1.2rem', height: '1.2rem' }} />
                  <span className="font-sans font-medium">Weekly digest (recommended)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                  <input type="checkbox" name="wantsInstant" defaultChecked={subscriber?.wantsInstant ?? false} style={{ width: '1.2rem', height: '1.2rem' }} />
                  <span className="font-sans font-medium">Email me as soon as a story publishes</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                  <input type="checkbox" name="wantsBreaking" defaultChecked={subscriber?.wantsBreaking ?? true} style={{ width: '1.2rem', height: '1.2rem' }} />
                  <span className="font-sans font-medium">Breaking alerts by email</span>
                </label>
              </div>
              
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

        {/* FAVORITES SECTION */}
        <section>
          <h2 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>My Favorites</h2>
          
          {favorites.length === 0 ? (
            <div style={{ backgroundColor: 'var(--surface)', padding: '2rem', borderRadius: '0.5rem', border: '1px solid var(--border)', textAlign: 'center' }}>
              <p className="font-sans text-muted" style={{ marginBottom: '1rem' }}>You haven't favorited any articles yet.</p>
              <Link href="/category/news" className="btn btn-primary font-sans text-sm">Browse Articles</Link>
            </div>
          ) : (
            <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {favorites.map((f) => (
                  <li key={f.id} style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <Link href={getArticleUrl(f.post)} style={{ textDecoration: 'none' }}>
                        <h3 className="font-serif hover:text-primary transition-colors" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                          {f.post.title}
                        </h3>
                      </Link>
                      <p className="font-sans text-sm text-muted">Favorited on {new Date(f.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Link href={getArticleUrl(f.post)} className="btn btn-secondary font-sans text-sm">
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
