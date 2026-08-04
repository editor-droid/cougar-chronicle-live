'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Briefcase, MapPin } from 'lucide-react';
import type { OpenRole, OpenRoleKind } from '@/lib/site-content-types';
import { updateOpenRolesAction } from '../team-media/actions';

function newId() {
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const field: import('react').CSSProperties = {
  width: '100%',
  padding: '0.35rem 0.5rem',
  borderRadius: '0.4rem',
  border: '1px solid #e8eaf0',
  background: '#fafbfd',
  fontSize: '0.82rem',
  fontFamily: 'var(--font-sans)',
  boxSizing: 'border-box',
};

export default function OpenRolesManager({
  initial,
  compact = false,
}: {
  initial: OpenRole[];
  compact?: boolean;
}) {
  const [roles, setRoles] = useState(initial);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  const save = () => {
    setMessage('');
    startTransition(async () => {
      try {
        await updateOpenRolesAction(roles);
        setMessage('Open roles saved. Apply page + form updated.');
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Save failed');
      }
    });
  };

  const update = (id: string, patch: Partial<OpenRole>) => {
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const rolesList = roles.filter((r) => r.kind === 'role');
  const beatsList = roles.filter((r) => r.kind === 'beat');

  const renderCard = (r: OpenRole) => (
    <article
      key={r.id}
      className="dash-card"
      style={{
        padding: compact ? '0.5rem 0.55rem' : '0.65rem 0.7rem',
        opacity: r.isOpen ? 1 : 0.5,
        borderColor: r.isOpen ? 'rgba(27,34,83,0.14)' : '#e8eaf0',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '0.3rem' : '0.4rem',
        minHeight: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: '0.4rem',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: r.kind === 'beat' ? 'rgba(27,34,83,0.08)' : 'linear-gradient(135deg,#1b2253,#3d4a8c)',
            color: r.kind === 'beat' ? 'var(--primary)' : '#fff',
          }}
        >
          {r.kind === 'beat' ? <MapPin size={13} /> : <Briefcase size={13} />}
        </span>
        <input
          style={{ ...field, fontWeight: 600, flex: 1, minWidth: 0 }}
          value={r.title}
          onChange={(e) => update(r.id, { title: e.target.value })}
          placeholder={r.kind === 'beat' ? 'Beat title' : 'Role title'}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
        <select
          className="font-sans"
          value={r.kind}
          onChange={(e) => update(r.id, { kind: e.target.value as OpenRoleKind })}
          style={{ ...field, width: 'auto', flex: '0 0 auto', paddingRight: '1.4rem' }}
        >
          <option value="role">Role</option>
          <option value="beat">Beat</option>
        </select>
        <button
          type="button"
          className="font-sans"
          onClick={() => update(r.id, { isOpen: !r.isOpen })}
          style={{
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.7rem',
            fontWeight: 800,
            padding: '0.28rem 0.55rem',
            borderRadius: '999px',
            background: r.isOpen ? 'rgba(22,163,74,0.14)' : 'var(--surface-hover)',
            color: r.isOpen ? '#166534' : 'var(--muted)',
            letterSpacing: '0.02em',
          }}
        >
          {r.isOpen ? 'Open' : 'Closed'}
        </button>
        <button
          type="button"
          onClick={() => setRoles((prev) => prev.filter((x) => x.id !== r.id))}
          style={{
            border: 'none',
            background: 'none',
            color: '#b91c1c',
            cursor: 'pointer',
            padding: '0.2rem',
            marginLeft: 'auto',
            lineHeight: 0,
          }}
          title="Remove"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </article>
  );

  const section = (label: string, list: OpenRole[]) => (
    <div style={{ marginBottom: compact ? '0.85rem' : '1rem' }}>
      <p
        className="font-sans"
        style={{
          fontSize: '0.68rem',
          fontWeight: 800,
          letterSpacing: '0.09em',
          color: '#6b7280',
          margin: '0 0 0.4rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}
      >
        {label}
        <span style={{ fontWeight: 700, letterSpacing: 0, color: 'var(--primary)' }}>
          {list.filter((r) => r.isOpen).length} open · {list.length} total
        </span>
      </p>
      {list.length === 0 ? (
        <div
          className="dash-empty font-sans"
          style={{ padding: '0.65rem', border: '1px dashed #e8eaf0', borderRadius: '0.55rem', fontSize: '0.82rem' }}
        >
          None yet
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: compact
              ? 'repeat(auto-fill, minmax(168px, 1fr))'
              : 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: compact ? '0.4rem' : '0.5rem',
          }}
        >
          {list.map(renderCard)}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ width: '100%' }}>
      <div className="dash-toolbar" style={{ marginBottom: '0.9rem' }}>
        <p className="font-sans text-muted" style={{ margin: 0, flex: '1 1 240px', fontSize: '0.88rem', lineHeight: 1.45 }}>
          Toggle <strong>Open</strong> to show on Apply and in the application form. Closed seats stay here for later.
        </p>
        <button type="button" className="dash-btn dash-btn-primary" disabled={pending} onClick={save}>
          {pending ? 'Saving…' : 'Save open roles'}
        </button>
      </div>

      {message && (
        <p
          className="font-sans"
          style={{
            marginBottom: '0.7rem',
            padding: '0.55rem 0.8rem',
            borderRadius: '0.55rem',
            background: /fail/i.test(message) ? 'rgba(185,28,28,0.08)' : 'rgba(5,150,105,0.1)',
            color: /fail/i.test(message) ? '#991b1b' : '#065f46',
            fontSize: '0.86rem',
          }}
        >
          {message}
        </p>
      )}

      {section('ROLES', rolesList)}
      {section('BEATS', beatsList)}

      <button
        type="button"
        className="dash-btn"
        style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
        onClick={() =>
          setRoles([
            ...roles,
            {
              id: newId(),
              title: '',
              kind: 'role',
              isOpen: true,
              sortOrder: roles.length,
            },
          ])
        }
      >
        <Plus size={15} /> Add role or beat
      </button>
    </div>
  );
}
