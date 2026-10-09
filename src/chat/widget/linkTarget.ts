import type { ChatSite } from './ChatSiteContext';

/** Public links must not be rewritten to nonexistent pages in the admin application. */
export function chatLinkTarget(href: string, currentUrl: string, site: ChatSite): { href: string; external: boolean } {
  if (href.startsWith('#')) return { href, external: false };
  const current = new URL(currentUrl);
  const url = new URL(href, current);
  const document = /\.[a-z0-9]+$/i.test(url.pathname);
  const ownOrigin = url.origin === current.origin;
  const publicOrigin = url.origin === 'https://apexmedia.kz';
  const publicPath = /^\/(cabinet|pricing|stores|signup|how-it-works|offer|privacy)(\/|$)/.test(url.pathname);
  if (site === 'admin' && ownOrigin && publicPath) {
    return { href: `https://apexmedia.kz${url.pathname}${url.search}${url.hash}`, external: true };
  }
  if (!url.username && !url.password && (ownOrigin || site === 'public' && publicOrigin)) {
    return { href: `${url.pathname}${url.search}${url.hash}`, external: document };
  }
  return { href: url.href, external: true };
}
