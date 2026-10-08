import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { AuthSessionContext, type AuthSessionState } from './useAuthSession';
import { sessionExpiresAt } from './adminAccess';

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthSessionState>({ status: supabase ? 'loading' : 'error', session: null });

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let revision = 0;
    let userId: string | null = null;
    let currentSession: Session | null = null;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;

    const updateSession = (session: Session | null) => {
      if (!active) return;
      clearTimeout(expiryTimer);
      // Auto-refresh may fail while offline. An expired JWT must not keep the UI open.
      if (session && sessionExpiresAt(session) <= Date.now()) session = null;
      const nextUserId = session?.user.id ?? null;
      if (!session || nextUserId !== userId) queryClient.clear();
      userId = nextUserId;
      currentSession = session;
      setState({ status: 'ready', session });
      if (session) expiryTimer = setTimeout(checkExpiry, Math.min(sessionExpiresAt(session) - Date.now(), 2_147_483_647));
    };
    const checkExpiry = () => {
      if (currentSession && sessionExpiresAt(currentSession) <= Date.now()) updateSession(null);
      else if (currentSession) {
        clearTimeout(expiryTimer);
        expiryTimer = setTimeout(checkExpiry, Math.min(sessionExpiresAt(currentSession) - Date.now(), 2_147_483_647));
      }
    };
    const sessionFailed = () => {
      clearTimeout(expiryTimer);
      currentSession = null;
      userId = null;
      queryClient.clear();
      setState({ status: 'error', session: null });
    };
    window.addEventListener('focus', checkExpiry);
    document.addEventListener('visibilitychange', checkExpiry);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      revision += 1;
      updateSession(session);
    });
    const readRevision = revision;
    void supabase.auth.getSession().then(({ data, error }) => {
      // A sign-in/sign-out event takes precedence over an older storage read.
      if (!active || revision !== readRevision) return;
      if (error) sessionFailed();
      else updateSession(data.session);
    }).catch(() => {
      if (active && revision === readRevision) sessionFailed();
    });

    return () => {
      active = false;
      clearTimeout(expiryTimer);
      window.removeEventListener('focus', checkExpiry);
      document.removeEventListener('visibilitychange', checkExpiry);
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return <AuthSessionContext.Provider value={state}>{children}</AuthSessionContext.Provider>;
}
