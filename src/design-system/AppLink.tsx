import type { AnchorHTMLAttributes } from 'react';
import { Link, useInRouterContext } from 'react-router';

/** Keep document downloads/external URLs native; route internal pages without a reload. */
export function AppLink({ href, download, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const inRouter = useInRouterContext();
  const pathname = href?.split(/[?#]/, 1)[0];
  const internal = href?.startsWith('/') && !href.startsWith('//') && !/\.[a-z0-9]+$/i.test(pathname ?? '');
  return inRouter && internal && (download === undefined || download === false)
    ? <Link {...props} to={href!} />
    : <a {...props} href={href} download={download} />;
}
