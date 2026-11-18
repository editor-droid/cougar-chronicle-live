import SubscribeForm from '@/components/SubscribeForm';

/** Mid-article signup. Same copy, colors, and /api/subscribe form as the end box. */
export default function ArticleInlineNewsletter() {
  return (
    <aside
      className="newsletter-box article-inline-newsletter"
      aria-label="Newsletter signup"
      style={{ margin: '2rem 0', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <h2 className="font-serif" style={{ color: 'white', fontSize: '1.5rem', margin: '0 0 0.35rem 0' }}>
        The Cougar Chronicle
      </h2>
      <p className="font-sans text-sm" style={{ marginBottom: '1rem', opacity: 0.9 }}>
        Get the best conservative journalism delivered to your inbox daily.
      </p>
      <SubscribeForm />
    </aside>
  );
}
