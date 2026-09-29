"use client";

import { useEffect, useRef } from 'react';

type Props = {
  userId: string;
  sessionStartedAt: number;
  timeoutSeconds: number;
};

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 10 * 1000;
const TAB_SESSION_KEY = 'inventory-session:active-tab';

export function IdleSessionManager({ userId, sessionStartedAt, timeoutSeconds }: Props) {
  const expiringRef = useRef(false);
  const heartbeatRunningRef = useRef(false);
  const lastHeartbeatAtRef = useRef(Date.now());
  const lastHeartbeatActivityRef = useRef(0);

  useEffect(() => {
    const timeoutMs = timeoutSeconds * 1000;
    const storageKey = `inventory-session:last-activity:${userId}`;
    const now = Date.now();
    const stored = Number(window.localStorage.getItem(storageKey) ?? 0);
    let lastActivity = Number.isFinite(stored) && stored >= sessionStartedAt ? stored : now;
    let lastWriteAt = 0;
    window.localStorage.setItem(storageKey, String(lastActivity));

    const expire = async (reason = 'session-expired') => {
      if (expiringRef.current) return;
      expiringRef.current = true;
      window.localStorage.removeItem(storageKey);
      window.sessionStorage.removeItem(TAB_SESSION_KEY);
      try {
        await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store', keepalive: true });
      } finally {
        window.location.replace(`/login?reason=${reason}`);
      }
    };

    // sessionStorage survives refreshes and client-side navigation, but is removed
    // when the user closes the website tab/window. A later visit must sign in again.
    if (window.sessionStorage.getItem(TAB_SESSION_KEY) !== 'active') {
      void expire('session-closed');
      return;
    }

    const heartbeat = async () => {
      if (heartbeatRunningRef.current || expiringRef.current) return;
      heartbeatRunningRef.current = true;
      try {
        const response = await fetch('/api/auth/heartbeat', { method: 'POST', cache: 'no-store' });
        if (response.status === 401) return void expire();
        if (response.ok) {
          lastHeartbeatAtRef.current = Date.now();
          lastHeartbeatActivityRef.current = lastActivity;
        }
      } catch {
        // A temporary network failure must not destroy a still-valid local session.
      } finally {
        heartbeatRunningRef.current = false;
      }
    };

    const recordActivity = () => {
      const activityAt = Date.now();
      if (activityAt - lastWriteAt < 1000) return;
      lastActivity = activityAt;
      lastWriteAt = activityAt;
      window.localStorage.setItem(storageKey, String(activityAt));
      if (activityAt - lastHeartbeatAtRef.current >= HEARTBEAT_INTERVAL_MS) void heartbeat();
    };

    const check = () => {
      const sharedActivity = Number(window.localStorage.getItem(storageKey) ?? 0);
      if (Number.isFinite(sharedActivity) && sharedActivity > lastActivity) lastActivity = sharedActivity;
      const checkedAt = Date.now();
      if (checkedAt - lastActivity >= timeoutMs) return void expire();
      if (lastActivity > lastHeartbeatActivityRef.current && checkedAt - lastHeartbeatAtRef.current >= HEARTBEAT_INTERVAL_MS) void heartbeat();
    };

    if (now - lastActivity >= timeoutMs) {
      void expire();
      return;
    }
    // A valid refresh/navigation counts as activity only after the previous idle time is checked.
    recordActivity();

    const events: Array<keyof WindowEventMap> = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((eventName) => window.addEventListener(eventName, recordActivity, { passive: true }));
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);
    const onVisibilityChange = () => { if (document.visibilityState === 'visible') check(); };
    const onStorage = (event: StorageEvent) => { if (event.key === storageKey) check(); };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('storage', onStorage);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, recordActivity));
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('storage', onStorage);
    };
  }, [sessionStartedAt, timeoutSeconds, userId]);

  return null;
}
