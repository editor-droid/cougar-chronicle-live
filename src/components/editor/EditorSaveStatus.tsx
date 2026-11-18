'use client';

import { useSyncExternalStore } from 'react';

type StatusSnap = { text: string };

let snap: StatusSnap = { text: '' };
const listeners = new Set<() => void>();

function emit(next: string) {
  if (snap.text === next) return;
  snap = { text: next };
  listeners.forEach((listener) => listener());
}

/** Updates the status chip without rendering the rest of the editor. */
export function setEditorSaveStatus(text: string) {
  emit(text);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snap;
}

function getServerSnapshot(): StatusSnap {
  return { text: '' };
}

export function EditorSaveStatus({ className }: { className?: string }) {
  const status = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!status.text) return null;
  return (
    <span className={className} role="status">
      {status.text}
    </span>
  );
}
