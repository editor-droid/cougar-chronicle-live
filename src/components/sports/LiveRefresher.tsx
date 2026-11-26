'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Reloads the server page about once a minute while a game is live. */
export default function LiveRefresher({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), 60_000);
    return () => clearInterval(id);
  }, [active, router]);
  return null;
}
