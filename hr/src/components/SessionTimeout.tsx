import { useEffect, useRef, useCallback } from 'react';
import { useAsyncData } from '@stratera/shared';
import { getHrApi } from '../api';

const api = getHrApi();

export function SessionTimeout({ onLogout }: { onLogout: () => void }) {
  const { data: settings } = useAsyncData(() => api.getSettings());
  const timeoutMs = (parseInt(settings?.sessionTimeoutMinutes ?? '30', 10) || 30) * 60 * 1000;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      api.logout().then(() => onLogout());
    }, timeoutMs);
  }, [timeoutMs, onLogout]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    reset();
    for (const ev of events) window.addEventListener(ev, reset);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const ev of events) window.removeEventListener(ev, reset);
    };
  }, [reset]);

  return null;
}
