export type AdminAccess = 'unconfigured' | 'signedOut' | 'error' | 'loading' | 'denied' | 'allowed';

/** A failed/refetching check must never reuse an earlier successful result. */
export function adminAccessState(input: {
  configured: boolean;
  sessionStatus: 'loading' | 'ready' | 'error';
  hasSession: boolean;
  roleError: boolean;
  rolePending: boolean;
  roleFetching: boolean;
  role: unknown;
}): AdminAccess {
  if (!input.configured) return 'unconfigured';
  if (input.sessionStatus === 'ready' && !input.hasSession) return 'signedOut';
  if (input.sessionStatus === 'error' || input.roleError) return 'error';
  if (input.sessionStatus === 'loading' || input.rolePending || input.roleFetching) return 'loading';
  return input.role === true ? 'allowed' : 'denied';
}

export function sessionExpiresAt(session: { expires_at?: number } | null): number {
  const value = session?.expires_at;
  return typeof value === 'number' && Number.isFinite(value) ? value * 1000 : 0;
}
