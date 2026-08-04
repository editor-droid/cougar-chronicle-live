'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

export type SubscriberRow = {
  id: string;
  email: string;
  isActive: boolean;
  wantsNews: boolean;
  wantsFaith: boolean;
  wantsOpinion: boolean;
  wantsVideos: boolean;
  createdAt: string;
};

type SortKey = 'createdAt' | 'email';
type TopicFilter = 'all' | 'news' | 'faith' | 'opinion' | 'videos';
type StatusFilter = 'all' | 'active' | 'inactive';

export default function SubscribersManager({
  initial,
}: {
  initial: SubscriberRow[];
}) {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<TopicFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    let rows = [...initial];

    if (status === 'active') rows = rows.filter((r) => r.isActive);
    if (status === 'inactive') rows = rows.filter((r) => !r.isActive);

    if (topic === 'news') rows = rows.filter((r) => r.wantsNews);
    if (topic === 'faith') rows = rows.filter((r) => r.wantsFaith);
    if (topic === 'opinion') rows = rows.filter((r) => r.wantsOpinion);
    if (topic === 'videos') rows = rows.filter((r) => r.wantsVideos);

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter((r) => r.email.toLowerCase().includes(q));
    }

    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'email') {
        cmp = a.email.localeCompare(b.email);
      } else {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [initial, query, topic, status, sortKey, sortOrder]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder(key === 'email' ? 'asc' : 'desc');
    }
  };

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <div>
      <div className="dash-toolbar">
        <div className="dash-search">
          <Search size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            type="search"
            placeholder="Search email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {(
            [
              ['all', 'All topics'],
              ['news', 'News'],
              ['faith', 'Faith'],
              ['opinion', 'Opinion'],
              ['videos', 'Videos'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`dash-pill ${topic === id ? 'dash-pill-active' : ''}`}
              onClick={() => setTopic(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {(
            [
              ['all', 'All status'],
              ['active', 'Active'],
              ['inactive', 'Inactive'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`dash-pill ${status === id ? 'dash-pill-active' : ''}`}
              onClick={() => setStatus(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="dash-card">
        <div className="dash-card-header">
          <h2 className="dash-section-title">Subscribers</h2>
          <span className="dash-badge dash-badge-navy">
            {filtered.length}
            {filtered.length !== initial.length ? ` / ${initial.length}` : ''}
          </span>
        </div>
        <div className="dashboard-table-scroll">
          {filtered.length === 0 ? (
            <div className="dash-empty">No subscribers match these filters.</div>
          ) : (
            <table className="dash-table">
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      onClick={() => toggleSort('createdAt')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        font: 'inherit',
                        color: 'inherit',
                        padding: 0,
                        letterSpacing: 'inherit',
                        textTransform: 'inherit',
                        fontWeight: 'inherit',
                      }}
                    >
                      Date{arrow('createdAt')}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      onClick={() => toggleSort('email')}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        font: 'inherit',
                        color: 'inherit',
                        padding: 0,
                        letterSpacing: 'inherit',
                        textTransform: 'inherit',
                        fontWeight: 'inherit',
                      }}
                    >
                      Email{arrow('email')}
                    </button>
                  </th>
                  <th>News</th>
                  <th>Faith</th>
                  <th>Opinion</th>
                  <th>Videos</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sub) => (
                  <tr key={sub.id} style={{ opacity: sub.isActive ? 1 : 0.55 }}>
                    <td className="text-muted">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ fontWeight: 700 }}>{sub.email}</td>
                    <td>{sub.wantsNews ? '✓' : '—'}</td>
                    <td>{sub.wantsFaith ? '✓' : '—'}</td>
                    <td>{sub.wantsOpinion ? '✓' : '—'}</td>
                    <td>{sub.wantsVideos ? '✓' : '—'}</td>
                    <td>
                      <span
                        className={`dash-badge ${sub.isActive ? 'dash-badge-green' : ''}`}
                      >
                        {sub.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
