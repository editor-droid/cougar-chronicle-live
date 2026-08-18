'use client';

import { Fragment, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';
import {
  formatTenure,
  type StaffActivity,
  type StaffLinkableUser,
  type StaffOrganizerRow,
} from '@/lib/staff-organizer-types';
import { TEAM_GROUP_LABELS, TEAM_GROUP_ORDER, type TeamGroup } from '@/lib/site-content-types';
import { updateStaffOrganizerMemberAction } from '../team-media/actions';

type SortKey = 'name' | 'publishedCount' | 'lastPublishedAt' | 'tenureStart' | 'activity';
type GroupFilter = 'all' | TeamGroup | 'account' | 'unlisted';
type ActivityFilter = 'all' | StaffActivity;

const ACTIVITY_META: Record<StaffActivity, { label: string; className: string }> = {
  hot: { label: 'Active now', className: 'dash-badge-green' },
  active: { label: 'Active', className: 'dash-badge-navy' },
  quiet: { label: 'Quiet', className: 'dash-badge-amber' },
  none: { label: 'No stories', className: 'dash-badge' },
};

const ACTIVITY_RANK: Record<StaffActivity, number> = { hot: 0, active: 1, quiet: 2, none: 3 };

function formatDay(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function StaffOrganizer({
  rows,
  users,
  summary,
}: {
  rows: StaffOrganizerRow[];
  users: StaffLinkableUser[];
  summary: { roster: number; published30: number; quiet: number; unlisted: number };
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<GroupFilter>('all');
  const [activity, setActivity] = useState<ActivityFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('publishedCount');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, { joinedAt: string; userId: string }>>({});

  const filtered = useMemo(() => {
    let list = [...rows];
    if (group !== 'all') list = list.filter((r) => r.group === group);
    if (activity !== 'all') list = list.filter((r) => r.activity === activity);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((r) =>
        `${r.name} ${r.title} ${r.groupLabel} ${r.userEmail || ''}`.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'publishedCount') cmp = a.publishedCount - b.publishedCount;
      else if (sortKey === 'activity') cmp = ACTIVITY_RANK[a.activity] - ACTIVITY_RANK[b.activity];
      else {
        const av = a[sortKey] || '';
        const bv = b[sortKey] || '';
        cmp = String(av).localeCompare(String(bv));
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [rows, query, group, activity, sortKey, sortOrder]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortOrder(key === 'name' ? 'asc' : 'desc');
    }
  };

  const arrow = (key: SortKey) => (sortKey === key ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : '');

  const draftFor = (row: StaffOrganizerRow) =>
    drafts[row.key] || { joinedAt: row.joinedAt || '', userId: row.userId || '' };

  const saveRow = (
    row: StaffOrganizerRow,
    extra?: { addToRoster?: boolean; group?: TeamGroup; joinedAt?: string; userId?: string }
  ) => {
    const d = draftFor(row);
    const joinedAt = extra?.joinedAt !== undefined ? extra.joinedAt : d.joinedAt;
    const userId = extra?.userId !== undefined ? extra.userId : d.userId;
    setMessage('');
    startTransition(async () => {
      try {
        await updateStaffOrganizerMemberAction({
          teamId: row.teamId,
          name: row.name,
          joinedAt: joinedAt || null,
          userId,
          addToRoster: extra?.addToRoster || row.source !== 'roster',
          group: extra?.group || (row.group === 'account' || row.group === 'unlisted' ? 'staff_writers' : row.group),
        });
        setMessage(
          extra?.addToRoster || row.source !== 'roster' ? `Added ${row.name} to the public roster.` : 'Saved start date.'
        );
        router.refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Save failed');
      }
    });
  };

  const saveStartDate = (row: StaffOrganizerRow, joinedAt: string) => {
    setDrafts((prev) => ({ ...prev, [row.key]: { ...draftFor(row), joinedAt } }));
    saveRow(row, { joinedAt });
  };

  return (
    <div>
      <p className="font-sans text-muted" style={{ margin: '0 0 1rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
        Use the <strong>Started</strong> date on each row — that is how long they have been on staff. It only lives
        here in the dashboard. If you leave it blank, we fall back to their first published story.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.65rem',
          marginBottom: '1rem',
        }}
      >
        {[
          ['On roster', summary.roster],
          ['Stories · 30 days', summary.published30],
          ['Quiet 90+ days', summary.quiet],
          ['Unlisted bylines', summary.unlisted],
        ].map(([label, value]) => (
          <div key={String(label)} className="dash-card" style={{ padding: '0.85rem 1rem' }}>
            <div className="font-sans text-muted" style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {label}
            </div>
            <div className="font-serif" style={{ fontSize: '1.65rem', fontWeight: 700, color: '#1B2253', lineHeight: 1.15 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="dash-toolbar">
        <div className="dash-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search name, title, email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="dash-pill"
          value={group}
          onChange={(e) => setGroup(e.target.value as GroupFilter)}
          style={{ minHeight: 36 }}
        >
          <option value="all">All groups</option>
          {TEAM_GROUP_ORDER.map((g) => (
            <option key={g} value={g}>
              {TEAM_GROUP_LABELS[g]}
            </option>
          ))}
          <option value="account">Account only</option>
          <option value="unlisted">Unlisted bylines</option>
        </select>
        <select
          className="dash-pill"
          value={activity}
          onChange={(e) => setActivity(e.target.value as ActivityFilter)}
          style={{ minHeight: 36 }}
        >
          <option value="all">Any activity</option>
          <option value="hot">Active now (30 days)</option>
          <option value="active">Active (90 days)</option>
          <option value="quiet">Quiet</option>
          <option value="none">No stories</option>
        </select>
      </div>

      {message && (
        <div
          className="font-sans"
          style={{
            marginBottom: '0.85rem',
            padding: '0.65rem 0.9rem',
            borderRadius: '0.65rem',
            background: /fail|error|not on/i.test(message) ? 'rgba(185,28,28,0.08)' : 'rgba(5,150,105,0.1)',
            color: /fail|error|not on/i.test(message) ? '#991b1b' : '#065f46',
            fontSize: '0.88rem',
          }}
        >
          {message}
        </div>
      )}

      <div className="dash-card dashboard-table-scroll">
        <table className="dash-table">
          <thead>
            <tr>
              <th>
                <button type="button" className="font-sans" style={thBtn} onClick={() => toggleSort('name')}>
                  Staff{arrow('name')}
                </button>
              </th>
              <th>
                <button type="button" className="font-sans" style={thBtn} onClick={() => toggleSort('publishedCount')}>
                  Stories{arrow('publishedCount')}
                </button>
              </th>
              <th>
                <button type="button" className="font-sans" style={thBtn} onClick={() => toggleSort('lastPublishedAt')}>
                  Last piece{arrow('lastPublishedAt')}
                </button>
              </th>
              <th>
                <button type="button" className="font-sans" style={thBtn} onClick={() => toggleSort('tenureStart')}>
                  Started{arrow('tenureStart')}
                </button>
              </th>
              <th>
                <button type="button" className="font-sans" style={thBtn} onClick={() => toggleSort('activity')}>
                  Activity{arrow('activity')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="font-sans text-muted" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  No one matches those filters.
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const open = openKey === row.key;
                const d = draftFor(row);
                return (
                  <Fragment key={row.key}>
                    <tr style={{ background: open ? '#f8f9fc' : undefined }}>
                      <td>
                        <button
                          type="button"
                          onClick={() => setOpenKey(open ? null : row.key)}
                          style={{
                            border: 'none',
                            background: 'none',
                            padding: 0,
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                        >
                          <span className="font-serif" style={{ fontWeight: 700, display: 'block', color: '#1B2253' }}>
                            {row.name}
                          </span>
                          <span className="font-sans text-muted" style={{ fontSize: '0.75rem' }}>
                            {row.title ? `${row.title} · ` : ''}
                            {row.groupLabel}
                            {row.source === 'unlisted' ? ' · not on About' : ''}
                          </span>
                        </button>
                      </td>
                      <td className="font-sans" style={{ fontWeight: 700 }}>
                        {row.publishedCount}
                        {row.pipelineCount > 0 && (
                          <span className="text-muted" style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                            {' '}
                            +{row.pipelineCount} in pipeline
                          </span>
                        )}
                      </td>
                      <td className="font-sans" style={{ fontSize: '0.85rem' }}>
                        {formatDay(row.lastPublishedAt)}
                        {row.last90 > 0 && (
                          <span className="text-muted" style={{ display: 'block', fontSize: '0.72rem' }}>
                            {row.last90} in 90 days
                          </span>
                        )}
                      </td>
                      <td>
                        <input
                          type="date"
                          aria-label={`${row.name} start date`}
                          value={d.joinedAt}
                          disabled={pending}
                          onChange={(e) => saveStartDate(row, e.target.value)}
                          style={{
                            width: '100%',
                            minWidth: '9.5rem',
                            padding: '0.4rem 0.5rem',
                            borderRadius: '0.5rem',
                            border: d.joinedAt ? '1px solid #e8eaf0' : '1px dashed #c5cad6',
                            background: '#fff',
                            fontSize: '0.85rem',
                            fontFamily: 'var(--font-sans)',
                          }}
                        />
                        <span className="font-sans text-muted" style={{ display: 'block', fontSize: '0.72rem', marginTop: '0.2rem' }}>
                          {d.joinedAt
                            ? formatTenure(d.joinedAt)
                            : row.firstPublishedAt
                              ? `or first story ${formatDay(row.firstPublishedAt)}`
                              : 'Enter start date'}
                        </span>
                      </td>
                      <td>
                        <span className={`dash-badge ${ACTIVITY_META[row.activity].className}`}>
                          {ACTIVITY_META[row.activity].label}
                        </span>
                      </td>
                    </tr>
                    {open && (
                      <tr style={{ background: '#f8f9fc' }}>
                        <td colSpan={5} style={{ padding: '0 1rem 1rem' }}>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                              gap: '0.75rem',
                              marginBottom: '0.85rem',
                            }}
                          >
                            <label className="font-sans" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4b5563' }}>
                              Linked account
                              <select
                                value={d.userId}
                                onChange={(e) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [row.key]: { ...draftFor(row), userId: e.target.value },
                                  }))
                                }
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  marginTop: '0.3rem',
                                  padding: '0.45rem 0.6rem',
                                  borderRadius: '0.5rem',
                                  border: '1px solid #e8eaf0',
                                  background: '#fff',
                                  fontSize: '0.88rem',
                                }}
                              >
                                <option value="">None — match by name</option>
                                {users.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name}
                                    {u.email ? ` (${u.email})` : ''} · {u.role}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <div className="dash-row-actions" style={{ marginBottom: '0.75rem' }}>
                            <button
                              type="button"
                              className="dash-btn dash-btn-primary"
                              disabled={pending}
                              onClick={() => saveRow(row)}
                            >
                              {pending ? 'Saving…' : row.source === 'roster' ? 'Save account link' : 'Add to roster & save'}
                            </button>
                            {row.userId && (
                              <Link href={`/author/${row.userId}`} className="dash-btn">
                                Public author page
                              </Link>
                            )}
                          </div>

                          {row.recent.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                              {row.recent.map((story) => (
                                <li key={story.id} className="font-sans" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                                  <Link href={story.href} style={{ color: '#1B2253', fontWeight: 600 }}>
                                    {story.title}
                                  </Link>
                                  <span className="text-muted"> · {formatDay(story.publishedAt)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="font-sans text-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                              No published stories under this byline yet.
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thBtn: import('react').CSSProperties = {
  border: 'none',
  background: 'none',
  padding: 0,
  cursor: 'pointer',
  color: 'inherit',
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  fontSize: '0.7rem',
};
