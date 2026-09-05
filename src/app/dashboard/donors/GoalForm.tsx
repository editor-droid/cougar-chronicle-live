'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateFundraiserGoal } from './actions';
import { formatGoalDollars } from '@/lib/donations';

const field: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.85rem',
  borderRadius: '0.65rem',
  border: '1px solid #e8eaf0',
  background: 'var(--surface-hover)',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.95rem',
};

export default function GoalForm({ currentGoal }: { currentGoal: number }) {
  const router = useRouter();
  const [goal, setGoal] = useState(String(currentGoal));
  const [message, setMessage] = useState('');
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      {message ? (
        <p
          className="font-sans text-sm"
          style={{
            marginBottom: '0.75rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '0.65rem',
            background: ok ? 'rgba(5,150,105,0.1)' : 'rgba(185,28,28,0.08)',
            color: ok ? '#065f46' : '#991b1b',
          }}
        >
          {message}
        </p>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setMessage('');
          setOk(false);
          startTransition(async () => {
            try {
              const result = await updateFundraiserGoal(goal);
              setGoal(String(result.goal));
              setOk(true);
              setMessage(`Goal saved: ${formatGoalDollars(result.goal)}`);
              router.refresh();
            } catch (err) {
              setOk(false);
              setMessage(err instanceof Error ? err.message : 'Failed to save goal');
            }
          });
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      >
        <label className="font-sans text-sm text-muted" htmlFor="fundraiser-goal">
          Fundraiser goal ($)
        </label>
        <input
          id="fundraiser-goal"
          type="text"
          inputMode="numeric"
          name="goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="15000"
          className="font-sans"
          style={field}
        />
        <button
          type="submit"
          className="dash-btn dash-btn-primary"
          style={{ alignSelf: 'flex-start' }}
          disabled={pending || !goal.trim()}
        >
          {pending ? 'Saving…' : 'Update goal'}
        </button>
      </form>
    </div>
  );
}
