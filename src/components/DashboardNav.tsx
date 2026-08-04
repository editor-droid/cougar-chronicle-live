'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

type Tab =
  | 'posts'
  | 'users'
  | 'print-editions'
  | 'donors'
  | 'subscribers'
  | 'videos'
  | 'links'
  | 'team'
  | 'media'
  | 'appearances'
  | 'team-media'
  | 'analytics';

export default function DashboardNav({
  currentTab,
  role,
  isEditorOrAdmin,
}: {
  currentTab: Tab;
  role: string;
  isEditorOrAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!isEditorOrAdmin) {
    return null;
  }

  const link = (tab: Tab, href: string, label: string) =>
    currentTab === tab ? (
      <span key={tab} className="dash-nav-active">
        {label}
      </span>
    ) : (
      <Link key={tab} href={href} onClick={() => setOpen(false)}>
        {label}
      </Link>
    );

  return (
    <div className="dash-nav-wrap">
      <button
        type="button"
        className="dash-menu-toggle"
        aria-expanded={open}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
        <span className="dash-menu-toggle-label">{open ? 'Close' : 'Menu'}</span>
      </button>
      <nav className={`dash-nav ${open ? 'open' : ''}`} aria-label="Dashboard">
        {link('posts', '/dashboard', 'Posts')}
        {link('analytics', '/dashboard/analytics', 'Performance')}
        {role === 'ADMIN' && link('users', '/dashboard/users', 'Users')}
        {link('print-editions', '/dashboard/print-editions', 'Editions')}
        {link('videos', '/dashboard/videos', 'Videos')}
        {link('links', '/dashboard/links', 'Links')}
        {role === 'ADMIN' && link('team', '/dashboard/team', 'Team')}
        {role === 'ADMIN' && link('appearances', '/dashboard/appearances', 'Appearances')}
        {role === 'ADMIN' && link('donors', '/dashboard/donors', 'Donors')}
        {role === 'ADMIN' && link('subscribers', '/dashboard/subscribers', 'Subscribers')}
        <Link href="/dashboard/print-orders" onClick={() => setOpen(false)}>
          Orders
        </Link>
      </nav>
    </div>
  );
}
