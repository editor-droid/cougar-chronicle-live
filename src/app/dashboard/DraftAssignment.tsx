'use client';

import { useRef, useState } from 'react';
import { updateDraftAssignment } from './actions';
import { staffLabel, useDeskStaff } from './DeskStaff';

type DraftAssignmentProps = {
  postId: string;
  title: string;
  writerId: string;
  editorId: string;
  targetDate: string;
};

type Fields = {
  writerId: string;
  editorId: string;
  targetDate: string;
};

function denverToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' }).format(new Date());
}

export default function DraftAssignment({
  postId,
  title,
  writerId,
  editorId,
  targetDate,
}: DraftAssignmentProps) {
  const { writers, editors, openNewWriter } = useDeskStaff();
  const [fields, setFields] = useState<Fields>({ writerId, editorId, targetDate });
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const latest = useRef<Fields>(fields);
  const saved = useRef<Fields>({ writerId, editorId, targetDate });
  const queue = useRef(Promise.resolve());

  function commit() {
    queue.current = queue.current
      .then(async () => {
        const next = latest.current;
        const previous = saved.current;
        if (
          next.writerId === previous.writerId &&
          next.editorId === previous.editorId &&
          next.targetDate === previous.targetDate
        ) {
          return;
        }
        setStatus('saving');
        setMessage('');
        const result = await updateDraftAssignment({ postId, ...next });
        if (!result.ok) {
          setStatus('error');
          setMessage(result.message);
          return;
        }
        saved.current = { ...next };
        setStatus('saved');
        setMessage(result.message);
        window.setTimeout(() => {
          setMessage((current) => (current === result.message ? '' : current));
          setStatus((current) => (current === 'saved' ? 'idle' : current));
        }, 2200);
      })
      .catch(() => {
        setStatus('error');
        setMessage('Could not save');
      });
  }

  function update(partial: Partial<Fields>, saveNow = false) {
    const next = { ...latest.current, ...partial };
    latest.current = next;
    setFields(next);
    if (saveNow) commit();
  }

  const overdue = fields.targetDate !== '' && fields.targetDate < denverToday();
  const story = title.trim() || 'this story';
  const selectedWriter = writers.find((person) => person.id === fields.writerId);
  const writerHasNoEmail = Boolean(selectedWriter && !selectedWriter.email);

  return (
    <>
      <td>
        <select
          className="dash-assign-input"
          aria-label={`Writer for ${story}`}
          value={fields.writerId}
          onChange={(event) => {
            const value = event.target.value;
            if (value === '__new__') {
              openNewWriter((person) => update({ writerId: person.id }, true));
              return;
            }
            update({ writerId: value }, true);
          }}
        >
          <option value="">Unassigned</option>
          {fields.writerId && !writers.some((person) => person.id === fields.writerId) ? (
            <option value={fields.writerId}>Former staff</option>
          ) : null}
          {writers.map((person) => (
            <option key={person.id} value={person.id}>
              {staffLabel(person, writers)}
            </option>
          ))}
          <option value="__new__">Add a writer…</option>
        </select>
        {writerHasNoEmail ? <span className="dash-assign-status">No email on file</span> : null}
      </td>
      <td>
        <select
          className="dash-assign-input"
          aria-label={`Editor for ${story}`}
          value={fields.editorId}
          onChange={(event) => update({ editorId: event.target.value }, true)}
        >
          <option value="">Unassigned</option>
          {fields.editorId && !editors.some((person) => person.id === fields.editorId) ? (
            <option value={fields.editorId}>Former staff</option>
          ) : null}
          {editors.map((person) => (
            <option key={person.id} value={person.id}>
              {staffLabel(person, editors)}
            </option>
          ))}
        </select>
      </td>
      <td>
        <div className="dash-assign-date">
          <input
            className={`dash-assign-input${overdue ? ' dash-assign-overdue' : ''}`}
            type="date"
            name={`target-${postId}`}
            aria-label={`Target publish date for ${story}`}
            value={fields.targetDate}
            onChange={(event) => update({ targetDate: event.target.value }, true)}
            onBlur={() => commit()}
          />
          <span
            className={`dash-assign-status${status === 'error' ? ' dash-assign-status-error' : ''}`}
            aria-live="polite"
          >
            {status === 'saving' ? 'Saving…' : message}
          </span>
        </div>
      </td>
    </>
  );
}
