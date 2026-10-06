import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { AuthSessionContext, type AuthSessionState } from './useAuthSession';

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthSessionState>({ status: supabase ? 'loading' : 'error', session: null });

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    let revision = 0;
    let userId: string | null = null;

    const updateSession = (session: Session | null) => {
      if (!active) return;
      const nextUserId = session?.user.id ?? null;
      if (nextUserId !== userId) queryClient.clear();
      userId = nextUserId;
      setState({ status: 'ready', session });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      revision += 1;
      updateSession(session);
    });
    const readRevision = revision;
    void supabase.auth.getSession().then(({ data, error }) => {
      // A sign-in/sign-out event takes precedence over an older storage read.
      if (!active || revision !== readRevision) return;
      if (error) setState({ status: 'error', session: null });
      else updateSession(data.session);
    }).catch(() => {
      if (active && revision === readRevision) setState({ status: 'error', session: null });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return <AuthSessionContext.Provider value={state}>{children}</AuthSessionContext.Provider>;
}
