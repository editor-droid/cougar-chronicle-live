import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  description: 'Unsubscribe from The Cougar Chronicle newsletter.',
};

export default function UnsubscribeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
