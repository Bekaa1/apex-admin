import { lazy, Suspense, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { ChatSiteContext, type ChatSite } from './ChatSiteContext';
import { useChatClearance } from './useChatClearance';
import styles from './ChatRouteLayout.module.css';

const ChatWidget = lazy(() => import('./ChatWidget'));

/** One persistent widget outside all page layouts and access guards. No Chat Auth until opened. */
export function ChatRouteLayout({ site = 'public' }: { site?: ChatSite }) {
  const { key } = useLocation();
  const frame = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  useChatClearance(frame, page, key);
  return <ChatSiteContext.Provider value={site}><div ref={frame} className={styles.frame}>
    <div ref={page} className={styles.page}><Outlet /></div>
    <Suspense fallback={null}><ChatWidget /></Suspense>
  </div></ChatSiteContext.Provider>;
}
