'use client';

import { createContext, useContext, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createDeskWriter } from './actions';

export type DeskPerson = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
};

type DeskStaffContextValue = {
  writers: DeskPerson[];
  editors: DeskPerson[];
  openNewWriter: (onCreated: (person: DeskPerson) => void) => void;
};

const DeskStaffContext = createContext<DeskStaffContextValue | null>(null);

export function useDeskStaff(): DeskStaffContextValue {
  const value = useContext(DeskStaffContext);
  if (!value) throw new Error('Draft assignment is outside the staff list.');
  return value;
}

function byName(a: DeskPerson, b: DeskPerson): number {
  const left = (a.name || a.email || '').toLocaleLowerCase();
  const right = (b.name || b.email || '').toLocaleLowerCase();
  return left.localeCompare(right);
}

export function staffLabel(person: DeskPerson, people: DeskPerson[]): string {
  const name = person.name?.trim() || 'Unnamed';
  const shared = people.filter((item) => (item.name?.trim() || 'Unnamed') === name).length > 1;
  if (shared && person.email) return `${name} (${person.email})`;
  return name;
}

export function DeskStaffProvider({
  writers,
  editors,
  children,
}: {
  writers: DeskPerson[];
  editors: DeskPerson[];
  children: ReactNode;
}) {
  const [people, setPeople] = useState(writers);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const onCreated = useRef<((person: DeskPerson) => void) | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  function openNewWriter(callback: (person: DeskPerson) => void) {
    onCreated.current = callback;
    setName('');
    setEmail('');
    setError('');
    setPending(false);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    nameRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    const result = await createDeskWriter({ name, email });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setPeople((current) =>
      current.some((person) => person.id === result.user.id)
        ? current
        : [...current, result.user].sort(byName)
    );
    const created = onCreated.current;
    onCreated.current = null;
    setOpen(false);
    created?.(result.user);
  }

  return (
    <DeskStaffContext.Provider value={{ writers: people, editors, openNewWriter }}>
      {children}
      {open ? (
        <div className="dash-assign-overlay" onMouseDown={() => setOpen(false)}>
          <div
            className="dash-assign-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h3 id={titleId}>Add a writer</h3>
            <p>Name is required. Email is how deadline reminders and the password link are sent.</p>
            <form onSubmit={submit}>
              <label>
                Name
                <input
                  ref={nameRef}
                  type="text"
                  name="writer-name"
                  value={name}
                  maxLength={80}
                  required
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  name="writer-email"
                  value={email}
                  placeholder="Optional"
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              {error ? <p className="dash-assign-modal-error">{error}</p> : null}
              <div className="dash-assign-modal-actions">
                <button type="button" className="dash-btn" onClick={() => setOpen(false)} disabled={pending}>
                  Cancel
                </button>
                <button type="submit" className="dash-btn dash-btn-primary" disabled={pending}>
                  {pending ? 'Adding…' : 'Add writer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DeskStaffContext.Provider>
  );
}
