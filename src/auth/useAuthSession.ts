import { createContext, useContext } from 'react';
import type { Session } from '@supabase/supabase-js';

export type AuthSessionState =
  | { status: 'loading' | 'error'; session: null }
  | { status: 'ready'; session: Session | null };

export const AuthSessionContext = createContext<AuthSessionState | null>(null);

export function useAuthSession(): AuthSessionState {
  const value = useContext(AuthSessionContext);
  if (!value) throw new Error('useAuthSession must be used inside AuthSessionProvider');
  return value;
}
