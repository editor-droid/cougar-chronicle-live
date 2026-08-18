'use client';

import { useMemo, useState, useTransition } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
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

const field: import('react').CSSProperties = {
  width: '100%',
  padding: '0.45rem 0.6rem',
  borderRadius: '0.5rem',
  border: '1px solid #e8eaf0',
  background: 'var(--surface-hover)',
  fontSize: '0.88rem',
  fontFamily: 'var(--font-sans)',
  boxSizing: 'border-box',
};

const GROUP_HINT: Record<TeamGroup, string> = {
  editors: 'Leadership & section editors',
  staff_writers: 'Core staff — name only is fine',
  contributors: 'Guest & occasional writers',
  social: 'Social & content roles',
  emeritus: 'Editors emeritus & board',
};

export default function TeamRosterManager({
  initialTeam,
  compact = false,
}: {
  initialTeam: TeamMember[];
  compact?: boolean;
}) {
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

  const updateMember = (id: string, patch: Partial<TeamMember>) => {
    setTeam((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  return (
    <div style={{ width: '100%' }}>
      <div className="dash-toolbar" style={{ marginBottom: '1rem' }}>
        <p className="font-sans text-muted" style={{ margin: 0, flex: '1 1 240px', lineHeight: 1.5, fontSize: '0.9rem' }}>
          Public <strong>About Us</strong> roster. Staff Writers can leave title blank. Start date stays in the dashboard only.
        </p>
        <button type="button" className="dash-btn dash-btn-primary" disabled={pending} onClick={saveTeam}>
          {pending ? 'Saving…' : 'Save staff'}
        </button>
      </div>

      {message && (
        <div
          className="font-sans"
          style={{
            marginBottom: '0.85rem',
            padding: '0.65rem 0.9rem',
            borderRadius: '0.65rem',
            background: /fail|error/i.test(message) ? 'rgba(185,28,28,0.08)' : 'rgba(5,150,105,0.1)',
            color: /fail|error/i.test(message) ? '#991b1b' : '#065f46',
            fontSize: '0.88rem',
          }}
        >
          {message}
        </div>
      )}

      {TEAM_GROUP_ORDER.map((group) => (
        <section key={group} style={{ marginBottom: compact ? '1.15rem' : '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.65rem',
              marginBottom: '0.55rem',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h3
                className="font-serif"
                style={{ fontSize: '1.1rem', margin: 0, color: '#1B2253' }}
              >
                {TEAM_GROUP_LABELS[group]}
                <span className="font-sans text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, marginLeft: '0.45rem' }}>
                  {teamByGroup[group].length}
                </span>
              </h3>
              {!compact && (
                <p className="font-sans text-muted" style={{ margin: '0.15rem 0 0', fontSize: '0.78rem' }}>
                  {GROUP_HINT[group]}
                </p>
              )}
            </div>
            <button
              type="button"
              className="dash-btn"
              style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem', minHeight: 34 }}
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
              <Plus size={14} /> Add
            </button>
          </div>

          {teamByGroup[group].length === 0 ? (
            <div className="dash-empty" style={{ padding: '0.85rem', border: '1px dashed #e8eaf0', borderRadius: '0.65rem' }}>
              Empty group
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: compact
                  ? 'repeat(auto-fill, minmax(168px, 1fr))'
                  : 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))',
                gap: compact ? '0.4rem' : '0.55rem',
              }}
            >
              {teamByGroup[group].map((member) => (
                <article
                  key={member.id}
                  className="dash-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    overflow: 'hidden',
                    minHeight: 0,
                  }}
                >
                  <div
                    style={{
                      width: compact ? 36 : 44,
                      flexShrink: 0,
                      background: 'linear-gradient(180deg, #1b2253 0%, #3d4a8c 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                    }}
                  >
                    <Users size={compact ? 15 : 18} />
                  </div>
                  <div
                    style={{
                      padding: compact ? '0.4rem 0.45rem' : '0.55rem 0.6rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: compact ? '0.25rem' : '0.35rem',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <input
                      style={field}
                      placeholder="Name"
                      value={member.name}
                      onChange={(e) => updateMember(member.id, { name: e.target.value })}
                    />
                    <input
                      style={field}
                      placeholder={group === 'staff_writers' ? 'Title (optional)' : 'Title'}
                      value={member.title}
                      onChange={(e) => updateMember(member.id, { title: e.target.value })}
                    />
                    <label className="font-sans text-muted" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                      Started
                      <input
                        type="date"
                        style={{ ...field, marginTop: '0.2rem' }}
                        value={member.joinedAt || ''}
                        onChange={(e) => updateMember(member.id, { joinedAt: e.target.value || undefined })}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setTeam(team.filter((t) => t.id !== member.id))}
                      className="font-sans"
                      style={{
                        alignSelf: 'flex-start',
                        border: 'none',
                        background: 'none',
                        color: '#b91c1c',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
