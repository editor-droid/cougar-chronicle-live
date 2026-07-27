'use client';

import { useMemo, useState, useTransition } from 'react';
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

export default function UsersManager({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<
    Record<string, { name: string; email: string; role: Role }>
  >(() => {
    const init: Record<string, { name: string; email: string; role: Role }> = {};
    for (const u of users) {
      init[u.id] = {
        name: u.name || '',
        email: u.email || '',
        role: u.role,
      };
    }
    return init;
  });

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>('WRITER');

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
        setMessage(archived ? 'Restored user.' : 'Archived user.');
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
        setMessage(
          res.emailSent
            ? 'User created — welcome email sent with password link.'
            : 'User created.' + (newEmail ? ' (email not sent — check Resend config)' : ' No email provided.')
        );
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Create failed');
      }
    });
  };

  return (
    <div>
      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1.25rem',
          backgroundColor: 'var(--surface)',
          borderRadius: '0.5rem',
          border: '1px solid var(--border)',
        }}
      >
        <h2 className="font-serif" style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>
          Add staff
        </h2>
        <p className="font-sans text-muted" style={{ fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.45 }}>
          With an email, they get a welcome message and a link to set their password (Resend).
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
            alignItems: 'end',
          }}
        >
          <div>
            <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>
              Name
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="font-sans"
              style={{ width: '100%', padding: '0.65rem', borderRadius: '0.35rem', border: '1px solid var(--border)' }}
            />
          </div>
          <div>
            <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>
              Email
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="font-sans"
              style={{ width: '100%', padding: '0.65rem', borderRadius: '0.35rem', border: '1px solid var(--border)' }}
            />
          </div>
          <div>
            <label className="font-sans text-sm text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>
              Role
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className="font-sans"
              style={{ width: '100%', padding: '0.65rem', borderRadius: '0.35rem', border: '1px solid var(--border)' }}
            >
              <option value="WRITER">WRITER</option>
              <option value="EDITOR">EDITOR</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <button
            type="button"
            className="btn btn-primary font-sans"
            disabled={pending || !newName.trim()}
            onClick={addUser}
          >
            {pending ? 'Working…' : 'Add & email'}
          </button>
        </div>
      </div>

      {message && (
        <p
          className="font-sans"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            background: /fail|error|exist/i.test(message) ? '#fee2e2' : '#ecfdf5',
            color: /fail|error|exist/i.test(message) ? '#991b1b' : '#065f46',
          }}
        >
          {message}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
          alignItems: 'center',
        }}
      >
        <input
          placeholder="Search name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="font-sans"
          style={{ flex: '1 1 180px', padding: '0.55rem 0.75rem', borderRadius: '0.35rem', border: '1px solid var(--border)' }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="font-sans"
          style={{ padding: '0.55rem 0.75rem', borderRadius: '0.35rem', border: '1px solid var(--border)' }}
        >
          <option value="all">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <label className="font-sans text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived only
        </label>
      </div>

      <div style={{ backgroundColor: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 720 }}>
          <thead style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '0.85rem' }} className="font-sans text-sm text-muted">
                NAME
              </th>
              <th style={{ padding: '0.85rem' }} className="font-sans text-sm text-muted">
                EMAIL
              </th>
              <th style={{ padding: '0.85rem' }} className="font-sans text-sm text-muted">
                ROLE
              </th>
              <th style={{ padding: '0.85rem' }} className="font-sans text-sm text-muted">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center' }} className="font-sans text-muted">
                  No users match.
                </td>
              </tr>
            ) : (
              filtered.map((user) => {
                const d = drafts[user.id] || {
                  name: user.name || '',
                  email: user.email || '',
                  role: user.role,
                };
                const archived = Boolean(user.archivedAt);
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border)', opacity: archived ? 0.65 : 1 }}>
                    <td style={{ padding: '0.65rem' }}>
                      <input
                        value={d.name}
                        disabled={user.id === currentUserId}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [user.id]: { ...d, name: e.target.value },
                          }))
                        }
                        className="font-sans"
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '0.3rem', border: '1px solid var(--border)' }}
                      />
                    </td>
                    <td style={{ padding: '0.65rem' }}>
                      <input
                        value={d.email}
                        disabled={user.id === currentUserId}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [user.id]: { ...d, email: e.target.value },
                          }))
                        }
                        className="font-sans"
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '0.3rem', border: '1px solid var(--border)' }}
                      />
                    </td>
                    <td style={{ padding: '0.65rem' }}>
                      <select
                        value={d.role}
                        disabled={user.id === currentUserId}
                        onChange={(e) => {
                          const role = e.target.value as Role;
                          setDrafts((prev) => ({
                            ...prev,
                            [user.id]: { ...d, role },
                          }));
                          // Instant role save on change
                          startTransition(async () => {
                            try {
                              await updateUserFields({ userId: user.id, role });
                              setMessage(`Role → ${role}`);
                            } catch (err) {
                              setMessage(err instanceof Error ? err.message : 'Role update failed');
                            }
                          });
                        }}
                        className="font-sans"
                        style={{ padding: '0.45rem', borderRadius: '0.3rem', border: '1px solid var(--border)' }}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '0.65rem' }}>
                      {user.id !== currentUserId && (
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary font-sans text-sm"
                            disabled={pending}
                            onClick={() => saveUser(user.id)}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary font-sans text-sm"
                            disabled={pending}
                            onClick={() => toggleArchive(user.id, archived)}
                          >
                            {archived ? 'Restore' : 'Archive'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
