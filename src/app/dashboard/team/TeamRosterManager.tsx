'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  TEAM_GROUP_LABELS,
  TEAM_GROUP_ORDER,
  type TeamGroup,
  type TeamMember,
} from '@/lib/site-content-types';
import { updatePublicTeamAction } from '../team-media/actions';

function newId() {
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  borderRadius: '0.4rem',
  border: '1px solid var(--border)',
  background: 'var(--background)',
  fontSize: '0.95rem',
};

export default function TeamRosterManager({ initialTeam }: { initialTeam: TeamMember[] }) {
  const [team, setTeam] = useState(initialTeam);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  const teamByGroup = useMemo(() => {
    const map: Record<TeamGroup, TeamMember[]> = {
      editors: [],
      staff_writers: [],
      contributors: [],
      social: [],
      emeritus: [],
    };
    for (const m of team) map[m.group]?.push(m);
    for (const g of TEAM_GROUP_ORDER) {
      map[g].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [team]);

  const saveTeam = () => {
    setMessage('');
    startTransition(async () => {
      try {
        await updatePublicTeamAction(team);
        setMessage('Team roster saved. About page updated.');
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Save failed');
      }
    });
  };

  return (
    <div style={{ width: '100%' }}>
      <p className="font-sans text-muted" style={{ marginBottom: '1.25rem', lineHeight: 1.55, maxWidth: '40rem' }}>
        Public About Us roster. Staff Writers can leave title blank (name only).
      </p>

      {message && (
        <p
          className="font-sans"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            background: message.toLowerCase().includes('fail') ? '#fee2e2' : '#ecfdf5',
            color: message.toLowerCase().includes('fail') ? '#991b1b' : '#065f46',
            fontSize: '0.9rem',
          }}
        >
          {message}
        </p>
      )}

      {TEAM_GROUP_ORDER.map((group) => (
        <div key={group} style={{ marginBottom: '2rem' }}>
          <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--primary)' }}>
            {TEAM_GROUP_LABELS[group]}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '0.75rem' }}>
            {teamByGroup[group].map((member) => {
              const index = team.findIndex((t) => t.id === member.id);
              return (
                <div
                  key={member.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1.4fr) auto',
                    gap: '0.55rem',
                    alignItems: 'center',
                  }}
                >
                  <input
                    style={inputStyle}
                    placeholder="Name"
                    value={member.name}
                    onChange={(e) => {
                      const next = [...team];
                      next[index] = { ...member, name: e.target.value };
                      setTeam(next);
                    }}
                  />
                  <input
                    style={inputStyle}
                    placeholder="Title (optional)"
                    value={member.title}
                    onChange={(e) => {
                      const next = [...team];
                      next[index] = { ...member, title: e.target.value };
                      setTeam(next);
                    }}
                  />
                  <button
                    type="button"
                    className="font-sans text-sm"
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.4rem',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      cursor: 'pointer',
                      color: '#991b1b',
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => setTeam(team.filter((t) => t.id !== member.id))}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn-secondary font-sans text-sm"
            onClick={() =>
              setTeam([
                ...team,
                {
                  id: newId(),
                  name: '',
                  title: '',
                  group,
                  sortOrder: teamByGroup[group].length,
                },
              ])
            }
          >
            Add to {TEAM_GROUP_LABELS[group]}
          </button>
        </div>
      ))}

      <button type="button" className="btn btn-primary font-sans" disabled={pending} onClick={saveTeam}>
        {pending ? 'Saving…' : 'Save team roster'}
      </button>
    </div>
  );
}
