import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Game-day alerts',
  robots: { index: false, follow: false },
};

export default function AlertsLayout({ children }: { children: ReactNode }) {
  return children;
}
