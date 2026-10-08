/** A card can only return to its own list, never to an external history entry. */
export function listReturnTo(state: unknown, fallback: string): string {
  if (!state || typeof state !== 'object' || !('returnTo' in state) || typeof state.returnTo !== 'string') return fallback;
  const value = state.returnTo;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  const url = new URL(value, 'https://local.invalid');
  return url.origin === 'https://local.invalid' && url.pathname === fallback ? url.pathname + url.search : fallback;
}

export function adminReturnTo(search: string): string | null {
  const value = new URLSearchParams(search).get('next');
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  const url = new URL(value, 'https://local.invalid');
  return url.origin === 'https://local.invalid' && (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) ? url.pathname + url.search : null;
}
