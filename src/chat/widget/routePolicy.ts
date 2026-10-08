/** Opt-in by the public route tree; admin-only trees have no such handle. */
export function canShowChat(pathname: string, search: string, publicRoute: boolean): boolean {
  const path = pathname.toLowerCase();
  if (!publicRoute || /^\/(admin|login|signup|register|reset-password|access-denied|cabinet)(\/|$)/.test(path)) return false;
  // Legal documents opened as part of registration belong to the Auth flow.
  return new URLSearchParams(search).get('returnTo') !== '/signup';
}
