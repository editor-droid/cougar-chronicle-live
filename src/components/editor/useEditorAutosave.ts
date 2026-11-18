'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  draftsEqual,
  editorDraftStorageKey,
  shouldOfferRestore,
  type EditorDraft,
  type LocalEditorCopy,
} from '@/lib/editor-draft';
import {
  autosaveFireAt,
  formatSavedLabel,
  idleClock,
  noteEdit,
  type AutosaveClock,
} from '@/lib/editor-autosave';
import { setEditorSaveStatus } from '@/components/editor/EditorSaveStatus';

type Options = {
  postId?: string;
  postState?: string;
  serverUpdatedAt?: string | null;
  authorId: string;
  paused: boolean;
  draft: EditorDraft;
  applyDraft: (draft: EditorDraft) => void;
};

const recoveryListeners = new Set<() => void>();
const recoveryDecision = new Map<string, LocalEditorCopy | null>();

function subscribeRecovery(listener: () => void) {
  recoveryListeners.add(listener);
  return () => {
    recoveryListeners.delete(listener);
  };
}

function notifyRecovery() {
  recoveryListeners.forEach((listener) => listener());
}

/** Read the crash copy once per post so later autosave writes do not pop the banner. */
function recoverySnapshot(
  storageKey: string,
  serverUpdatedAt: string | null,
  serverDraft: EditorDraft
): LocalEditorCopy | null {
  if (recoveryDecision.has(storageKey)) return recoveryDecision.get(storageKey) ?? null;
  let value: LocalEditorCopy | null = null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const local = JSON.parse(raw) as LocalEditorCopy;
      if (
        local?.draft &&
        typeof local.savedAt === 'number' &&
        shouldOfferRestore(local, serverUpdatedAt, serverDraft)
      ) {
        value = local;
      }
    }
  } catch {
    value = null;
  }
  recoveryDecision.set(storageKey, value);
  return value;
}

function dismissStoredRecovery(storageKey: string) {
  recoveryDecision.set(storageKey, null);
  notifyRecovery();
}

function saveBody(snapshot: EditorDraft, postId: string, expectedUpdatedAt: string | null) {
  return {
    ...snapshot,
    id: postId,
    printEditionId: snapshot.printEditionId || null,
    breakingHours: snapshot.isBreaking ? snapshot.breakingHours || 24 : null,
    publishedAt: snapshot.publishedAt || undefined,
    autosave: true,
    expectedUpdatedAt,
  };
}

/**
 * Debounced autosave. Keystrokes update refs and a timer only.
 * The save label lives in EditorSaveStatus, outside this component's state.
 */
export function useEditorAutosave(options: Options) {
  const draftRef = useRef(options.draft);
  const savedRef = useRef(options.draft);
  const lastNotedRef = useRef(options.draft);
  const dirtyRef = useRef(false);
  const pausedRef = useRef(options.paused);
  const expectedUpdatedAtRef = useRef<string | null>(options.serverUpdatedAt ?? null);
  const clockRef = useRef<AutosaveClock>(idleClock());
  const timerRef = useRef<number | null>(null);
  const armedAtRef = useRef<number | null>(null);
  const epochRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const optionsRef = useRef(options);
  const [serverDraft] = useState(options.draft);

  const storageKey = editorDraftStorageKey(options.postId, options.authorId);
  const serverUpdatedAt = options.serverUpdatedAt ?? null;
  const recovery = useSyncExternalStore(
    subscribeRecovery,
    () => recoverySnapshot(storageKey, serverUpdatedAt, serverDraft),
    () => null
  );

  useEffect(() => {
    draftRef.current = options.draft;
    pausedRef.current = options.paused;
    optionsRef.current = options;
  });

  const writeLocal = useCallback(
    (draft: EditorDraft) => {
      const copy: LocalEditorCopy = {
        savedAt: Date.now(),
        serverUpdatedAt: expectedUpdatedAtRef.current,
        draft,
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(copy));
      } catch {
        /* private mode or a full disk */
      }
    },
    [storageKey]
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    armedAtRef.current = null;
  }, []);

  const flush = useCallback(async () => {
    if (pausedRef.current || !dirtyRef.current) return;
    const epoch = epochRef.current;
    const snapshot = draftRef.current;
    writeLocal(snapshot);

    const postId = optionsRef.current.postId;
    const published = optionsRef.current.postState === 'PUBLISHED';
    if (!postId) {
      if (epoch !== epochRef.current || !draftsEqual(draftRef.current, snapshot)) return;
      dirtyRef.current = true;
      clockRef.current = idleClock();
      clearTimer();
      setEditorSaveStatus(formatSavedLabel('Saved locally', new Date()));
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setEditorSaveStatus('Saving…');
    try {
      const res = await fetch('/api/dashboard/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveBody(snapshot, postId, expectedUpdatedAtRef.current)),
        signal: controller.signal,
      });
      if (epoch !== epochRef.current) return;
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        stale?: boolean;
        updatedAt?: string;
        mode?: string;
      };
      if (!res.ok) throw new Error(json.error || 'Couldn’t save');
      if (json.stale) {
        if (draftsEqual(draftRef.current, snapshot)) {
          clockRef.current = idleClock();
          clearTimer();
        }
        setEditorSaveStatus('Not saved · newer copy on the server');
        return;
      }
      if (!draftsEqual(draftRef.current, snapshot)) return;
      if (published || json.mode === 'local') {
        dirtyRef.current = true;
        clockRef.current = idleClock();
        clearTimer();
        setEditorSaveStatus(formatSavedLabel('Saved locally', new Date()));
        return;
      }
      if (json.updatedAt) expectedUpdatedAtRef.current = json.updatedAt;
      savedRef.current = snapshot;
      lastNotedRef.current = snapshot;
      dirtyRef.current = false;
      clockRef.current = idleClock();
      clearTimer();
      writeLocal(snapshot);
      setEditorSaveStatus(formatSavedLabel('Saved', new Date()));
    } catch (error) {
      if (epoch !== epochRef.current) return;
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setEditorSaveStatus('Couldn’t save · kept on this device');
    }
  }, [clearTimer, writeLocal]);

  const armTimer = useCallback(() => {
    const at = autosaveFireAt(clockRef.current);
    if (at == null) {
      clearTimer();
      return;
    }
    if (timerRef.current != null && armedAtRef.current === at) return;
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    armedAtRef.current = at;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      armedAtRef.current = null;
      void flush();
    }, Math.max(0, at - Date.now()));
  }, [clearTimer, flush]);

  const markSaved = useCallback(() => {
    epochRef.current += 1;
    abortRef.current?.abort();
    savedRef.current = draftRef.current;
    lastNotedRef.current = draftRef.current;
    dirtyRef.current = false;
    clockRef.current = idleClock();
    clearTimer();
    writeLocal(draftRef.current);
    setEditorSaveStatus(formatSavedLabel('Saved', new Date()));
  }, [clearTimer, writeLocal]);

  const checklist = options.draft.editorChecklist;

  useEffect(() => {
    if (options.paused) {
      clearTimer();
      return;
    }
    const current = draftRef.current;
    if (draftsEqual(current, savedRef.current)) {
      dirtyRef.current = false;
      clockRef.current = idleClock();
      lastNotedRef.current = current;
      clearTimer();
      return;
    }
    dirtyRef.current = true;
    if (!draftsEqual(current, lastNotedRef.current)) {
      lastNotedRef.current = current;
      clockRef.current = noteEdit(clockRef.current, Date.now());
    } else if (clockRef.current.dirtySince == null) {
      clockRef.current = noteEdit(clockRef.current, Date.now());
    }
    armTimer();
  }, [
    armTimer,
    clearTimer,
    options.paused,
    options.draft.title,
    options.draft.content,
    options.draft.slug,
    options.draft.category,
    options.draft.format,
    options.draft.imageUrl,
    options.draft.authorId,
    options.draft.seoTitle,
    options.draft.seoDescription,
    options.draft.seoKeywords,
    options.draft.keyInsights,
    options.draft.featuredImageAlt,
    options.draft.customAuthor,
    options.draft.isPremium,
    options.draft.showDonateCta,
    options.draft.isAmerica250,
    options.draft.isBreaking,
    options.draft.breakingHours,
    options.draft.printEditionId,
    options.draft.printEditionOrder,
    options.draft.imageCaption,
    options.draft.publishedAt,
    checklist.spellcheck,
    checklist.seo,
    checklist.formatting,
    checklist.oneWordLinks,
    checklist.ready,
  ]);

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      writeLocal(draftRef.current);
      event.preventDefault();
      event.returnValue = '';
    };
    const onHide = () => {
      if (dirtyRef.current) writeLocal(draftRef.current);
    };
    window.addEventListener('beforeunload', onLeave);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('beforeunload', onLeave);
      window.removeEventListener('pagehide', onHide);
      clearTimer();
      abortRef.current?.abort();
    };
  }, [clearTimer, writeLocal]);

  const dismissRecovery = useCallback(() => dismissStoredRecovery(storageKey), [storageKey]);
  const acceptRecovery = useCallback(() => {
    const current = recoverySnapshot(storageKey, serverUpdatedAt, serverDraft);
    if (!current) return;
    optionsRef.current.applyDraft(current.draft);
    dismissStoredRecovery(storageKey);
  }, [serverDraft, serverUpdatedAt, storageKey]);

  return { recovery, dismissRecovery, acceptRecovery, markSaved };
}
