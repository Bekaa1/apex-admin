import { lazy, Suspense } from 'react';
import { Outlet, useLocation, useMatches } from 'react-router';
import { canShowChat } from './routePolicy';

const ChatWidget = lazy(() => import('./ChatWidget'));

export function ChatRouteLayout() {
  const { pathname, search } = useLocation();
  const matches = useMatches();
  const publicRoute = matches.some(match => (match.handle as { publicChat?: boolean } | undefined)?.publicChat === true);
  return <><Outlet />{canShowChat(pathname, search, publicRoute) ? <Suspense fallback={null}><ChatWidget /></Suspense> : null}</>;
}
