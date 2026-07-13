'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MembershipCheckoutButton({
  label = 'Become a Member — $48/year',
  className = 'btn btn-primary font-sans',
  style,
}: {
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const startCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'subscription' }),
      });
      if (res.status === 401) {
        router.push('/login?callbackUrl=/membership');
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      alert(data.error || 'Could not start checkout. Please try again.');
    } catch {
      alert('Could not start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={startCheckout}
      disabled={loading}
      className={className}
      style={{ opacity: loading ? 0.75 : 1, ...style }}
    >
      {loading ? 'Redirecting to checkout…' : label}
    </button>
  );
}
