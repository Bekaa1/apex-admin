import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { requireSupabase } from '../lib/supabase';
import { DEFAULT_AUTH_LINKS } from './links';

export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const signOut = async () => {
    if (pending) return;
    setPending(true);
    setFailed(false);
    try {
      const { error } = await requireSupabase().auth.signOut({ scope: 'local' });
      if (error) throw error;
      queryClient.clear();
      await navigate(DEFAULT_AUTH_LINKS.login, { replace: true });
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  return { signOut, pending, failed };
}
