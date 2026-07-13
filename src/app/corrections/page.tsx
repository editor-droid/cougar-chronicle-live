import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Corrections Policy',
  description: 'How The Cougar Chronicle handles corrections and updates.',
};

export default function CorrectionsPage() {
  return (
    <div className="container animate-fade-in" style={{ maxWidth: '720px', marginTop: '2rem', marginBottom: '5rem' }}>
      <h1 className="font-serif" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
        Corrections Policy
      </h1>
      <p className="font-sans text-muted" style={{ lineHeight: 1.7, marginBottom: '1.25rem' }}>
        Accuracy matters. When we make a factual error, we correct it promptly and transparently.
      </p>
      <ul className="font-sans" style={{ lineHeight: 1.7, paddingLeft: '1.25rem', marginBottom: '1.5rem' }}>
        <li style={{ marginBottom: '0.75rem' }}>
          <strong>Significant errors</strong> (wrong facts, misattributions, material omissions) are corrected in
          the article with a clear note at the bottom of the story describing what changed.
        </li>
        <li style={{ marginBottom: '0.75rem' }}>
          <strong>Minor typos</strong> or style fixes that do not change meaning may be fixed without a formal note.
        </li>
        <li style={{ marginBottom: '0.75rem' }}>
          Readers who spot an error can write us via the{' '}
          <Link href="/contact" style={{ color: 'var(--primary)' }}>
            contact form
          </Link>
          . Please include the article title and a description of the issue.
        </li>
      </ul>
      <p className="font-sans text-muted" style={{ lineHeight: 1.7 }}>
        The Cougar Chronicle is an independent student publication. We are not the official voice of Brigham Young
        University.
      </p>
    </div>
  );
}
