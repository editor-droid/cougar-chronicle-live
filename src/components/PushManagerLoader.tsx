'use client';

import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  return Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export default function PushManagerLoader() {
  const [PushManager, setPushManager] = useState<ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const load = () => {
      import('./PushManager').then((mod) => {
        if (!cancelled) setPushManager(() => mod.default);
      });
    };

    if (isStandaloneDisplay()) {
      load();
    } else if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(load, { timeout: 3000 });
    } else {
      timeoutId = setTimeout(load, 3000);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  if (!PushManager) return null;
  return <PushManager />;
}
