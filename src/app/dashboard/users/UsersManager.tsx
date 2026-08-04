'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Plus, RotateCcw, Search, UserPlus, X } from 'lucide-react';
import { createStaffUser, updateUserFields } from '../actions';
import type { Role } from '@prisma/client';

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  archivedAt: Date | string | null;
};

const ROLES: Role[] = ['USER', 'WRITER', 'EDITOR', 'ADMIN'];

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  ADMIN: { bg: 'rgba(27, 34, 83, 0.12)', color: '#1B2253' },
  EDITOR: { bg: 'rgba(27, 34, 83, 0.08)', color: '#1B2253' },
  WRITER: { bg: 'rgba(107, 114, 128, 0.12)', color: '#374151' },
  USER: { bg: 'rgba(156, 163, 175, 0.15)', color: '#6B7280' },
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.85rem',
  borderRadius: '0.65rem',
  border: '1px solid transparent',
  background: 'var(--surface-hover)',
  fontSize: '0.95rem',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  transition: 'background 0.15s, box-shadow 0.15s',
};

export default function UsersManager({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [drafts, setDrafts] = useState<
    Record<string, { name: string; email: string; role: Role }>
  >({});

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('WRITER');

  useEffect(() => {
    const init: Record<string, { name: string; email: string; role: Role }> = {};
    for (const u of users) {
      init[u.id] = {
        name: u.name || '',
        email: u.email || '',
        role: u.role,
      };
    }
    setDrafts(init);
  }, [users]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const archived = Boolean(u.archivedAt);
      if (!showArchived && archived) return false;
      if (showArchived && !archived) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const hay = `${u.name || ''} ${u.email || ''} ${u.role}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, roleFilter, showArchived, query]);

  const saveUser = (userId: string) => {
    const d = drafts[userId];
    if (!d) return;
    setMessage('');
    startTransition(async () => {
      try {
        await updateUserFields({
          userId,
          name: d.name,
          email: d.email || null,
          role: d.role,
        });
        setMessage('Saved.');
        router.refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Save failed');
      }
    });
  };

  const toggleArchive = (userId: string, archived: boolean) => {
    setMessage('');
    startTransition(async () => {
      try {
        await updateUserFields({
          userId,
          archive: !archived,
          unarchive: archived,
        });
        setMessage(archived ? 'Restored.' : 'Archived.');
        router.refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Archive failed');
      }
    });
  };

  const addUser = () => {
    setMessage('');
    startTransition(async () => {
      try {
        const res = await createStaffUser({
          name: newName,
          email: newEmail || null,
          role: newRole,
        });
        setNewName('');
        setNewEmail('');
        setNewRole('WRITER');
        setAddOpen(false);
        setMessage(
          res.emailSent
            ? 'Staff added — welcome email sent with password link.'
            : 'Staff added.' +
                (newEmail ? ' (email not sent — check Resend)' : ' No email on file.')
        );
        router.refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Create failed');
      }
    });
  };

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <div
          style={{
            flex: '1 1 220px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 0.9rem',
            borderRadius: '999px',
            background: 'var(--surface-hover)',
          }}
        >
          <Search size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            placeholder="Search people…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="font-sans"
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '0.95rem',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.4rem',
            alignItems: 'center',
          }}
        >
          {(['all', ...ROLES] as const).map((r) => {
            const active = roleFilter === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className="font-sans"
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: active ? 'var(--primary)' : 'var(--surface-hover)',
                  color: active ? 'white' : 'var(--muted)',
                }}
              >
                {r === 'all' ? 'All' : r}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="font-sans"
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '999px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: showArchived ? 'rgba(185, 28, 28, 0.12)' : 'var(--surface-hover)',
              color: showArchived ? '#991b1b' : 'var(--muted)',
            }}
          >
            {showArchived ? 'Archived' : 'Active'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="btn btn-primary font-sans"
          style={{
            marginLeft: 'auto',
            borderRadius: '999px',
            gap: '0.4rem',
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.55rem 1.15rem',
          }}
        >
          <Plus size={16} /> Add staff
        </button>
      </div>

      {message && (
        <div
          className="font-sans"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            background: /fail|error|exist/i.test(message)
              ? 'rgba(185, 28, 28, 0.08)'
              : 'rgba(5, 150, 105, 0.1)',
            color: /fail|error|exist/i.test(message) ? '#991b1b' : '#065f46',
            fontSize: '0.9rem',
          }}
        >
          {message}
        </div>
      )}

      {/* People list — card rows, soft */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.55rem',
        }}
      >
        {filtered.length === 0 ? (
          <div
            className="font-sans text-muted"
            style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              background: 'var(--surface-hover)',
              borderRadius: '1rem',
            }}
          >
            No people match these filters.
          </div>
        ) : (
          filtered.map((user) => {
            const d = drafts[user.id] || {
              name: user.name || '',
              email: user.email || '',
              role: user.role,
            };
            const archived = Boolean(user.archivedAt);
            const isSelf = user.id === currentUserId;
            const roleLook = ROLE_STYLE[d.role] || ROLE_STYLE.USER;
            const dirty =
              d.name !== (user.name || '') ||
              d.email !== (user.email || '') ||
              d.role !== user.role;

            return (
              <div
                key={user.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1.2fr) auto auto',
                  gap: '0.75rem',
                  alignItems: 'center',
                  padding: '0.85rem 1rem',
                  borderRadius: '1rem',
                  background: archived ? 'rgba(0,0,0,0.03)' : 'var(--surface)',
                  boxShadow: '0 1px 2px rgba(27, 34, 83, 0.04)',
                  opacity: archived ? 0.72 : 1,
                }}
              >
                <div>
                  <input
                    value={d.name}
                    disabled={isSelf}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [user.id]: { ...d, name: e.target.value },
                      }))
                    }
                    placeholder="Name"
                    style={{
                      ...fieldStyle,
                      fontWeight: 600,
                      fontSize: '0.98rem',
                    }}
                  />
                </div>
                <div>
                  <input
                    value={d.email}
                    disabled={isSelf}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [user.id]: { ...d, email: e.target.value },
                      }))
                    }
                    placeholder="Email"
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <select
                    value={d.role}
                    disabled={isSelf}
                    onChange={(e) => {
                      const role = e.target.value as Role;
                      setDrafts((prev) => ({
                        ...prev,
                        [user.id]: { ...d, role },
                      }));
                      startTransition(async () => {
                        try {
                          await updateUserFields({ userId: user.id, role });
                          setMessage(`Updated to ${role}`);
                          router.refresh();
                        } catch (err) {
                          setMessage(err instanceof Error ? err.message : 'Role update failed');
                        }
                      });
                    }}
                    className="font-sans"
                    style={{
                      padding: '0.45rem 0.75rem',
                      borderRadius: '999px',
                      border: 'none',
                      background: roleLook.bg,
                      color: roleLook.color,
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      letterSpacing: '0.04em',
                      cursor: isSelf ? 'default' : 'pointer',
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                  {isSelf ? (
                    <span
                      className="font-sans"
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--muted)',
                        padding: '0.4rem 0.6rem',
                      }}
                    >
                      You
                    </span>
                  ) : (
                    <>
                      {dirty && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => saveUser(user.id)}
                          className="font-sans"
                          style={{
                            padding: '0.45rem 0.85rem',
                            borderRadius: '999px',
                            border: 'none',
                            background: 'var(--primary)',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          Save
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => toggleArchive(user.id, archived)}
                        title={archived ? 'Restore' : 'Archive'}
                        className="font-sans"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          border: 'none',
                          background: 'var(--surface-hover)',
                          color: archived ? '#065f46' : 'var(--muted)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {archived ? <RotateCcw size={15} /> : <Archive size={15} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add staff modal */}
      {addOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add staff"
          onClick={() => !pending && setAddOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(27, 34, 83, 0.35)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              background: 'var(--background)',
              borderRadius: '1.15rem',
              padding: '1.5rem',
              boxShadow: '0 24px 48px rgba(27, 34, 83, 0.18)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'rgba(27, 34, 83, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                  }}
                >
                  <UserPlus size={18} />
                </div>
                <h2 className="font-serif" style={{ fontSize: '1.35rem', margin: 0 }}>
                  Add staff
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                style={{
                  border: 'none',
                  background: 'var(--surface-hover)',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
            <p className="font-sans text-muted" style={{ fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              With an email, they get a welcome message and a link to set their password.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label className="font-sans" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>
                  Name
                </label>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name"
                  style={{ ...fieldStyle, marginTop: '0.35rem' }}
                />
              </div>
              <div>
                <label className="font-sans" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="optional@school.edu"
                  style={{ ...fieldStyle, marginTop: '0.35rem' }}
                />
              </div>
              <div>
                <label className="font-sans" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>
                  Role
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                  {(['WRITER', 'EDITOR', 'ADMIN'] as Role[]).map((r) => {
                    const active = newRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setNewRole(r)}
                        className="font-sans"
                        style={{
                          padding: '0.45rem 0.9rem',
                          borderRadius: '999px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          background: active ? 'var(--primary)' : 'var(--surface-hover)',
                          color: active ? 'white' : 'var(--muted)',
                        }}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary font-sans"
                disabled={pending || !newName.trim()}
                onClick={addUser}
                style={{
                  marginTop: '0.5rem',
                  borderRadius: '999px',
                  width: '100%',
                  padding: '0.85rem',
                }}
              >
                {pending ? 'Adding…' : 'Create & send invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
