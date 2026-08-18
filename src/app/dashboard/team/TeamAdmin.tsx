'use client';

import { useState } from 'react';
import type { OpenRole, TeamMember } from '@/lib/site-content-types';
import type { StaffLinkableUser, StaffOrganizerRow } from '@/lib/staff-organizer-types';
import TeamRosterManager from './TeamRosterManager';
import OpenRolesManager from './OpenRolesManager';
import StaffOrganizer from './StaffOrganizer';

type Tab = 'organizer' | 'staff' | 'roles';

export default function TeamAdmin({
  team,
  openRoles,
  organizerRows,
  organizerUsers,
  organizerSummary,
}: {
  team: TeamMember[];
  openRoles: OpenRole[];
  organizerRows: StaffOrganizerRow[];
  organizerUsers: StaffLinkableUser[];
  organizerSummary: { roster: number; published30: number; quiet: number; unlisted: number };
}) {
  const [tab, setTab] = useState<Tab>('organizer');
  const openCount = openRoles.filter((r) => r.isOpen).length;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Team sections"
        style={{
          display: 'inline-flex',
          padding: '0.28rem',
          borderRadius: '999px',
          background: 'var(--surface-hover)',
          gap: '0.2rem',
          marginBottom: '1.15rem',
          border: '1px solid #e8eaf0',
        }}
      >
        {(
          [
            ['organizer', 'Organizer', organizerRows.length],
            ['staff', 'Public roster', team.length],
            ['roles', 'Open roles', openCount],
          ] as const
        ).map(([id, label, count]) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className="font-sans"
              style={{
                border: 'none',
                cursor: 'pointer',
                padding: '0.48rem 1.05rem',
                borderRadius: '999px',
                fontSize: '0.86rem',
                fontWeight: 700,
                background: active ? 'var(--primary)' : 'transparent',
                color: active ? '#fff' : 'var(--muted)',
                boxShadow: active ? '0 4px 14px -6px rgba(27,34,83,0.45)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              {label}
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '0.1rem 0.4rem',
                  borderRadius: '999px',
                  background: active ? 'rgba(255,255,255,0.2)' : 'rgba(27,34,83,0.08)',
                  color: active ? '#fff' : 'var(--primary)',
                  minWidth: '1.35rem',
                  textAlign: 'center',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === 'organizer' ? (
        <StaffOrganizer rows={organizerRows} users={organizerUsers} summary={organizerSummary} />
      ) : tab === 'staff' ? (
        <TeamRosterManager initialTeam={team} compact />
      ) : (
        <OpenRolesManager initial={openRoles} compact />
      )}
    </div>
  );
}
