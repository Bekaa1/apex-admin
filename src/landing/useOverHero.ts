import { useEffect, useState } from 'react';

// The page is short, so the hero text reaches the header after a little scrolling: the header turns solid right away.
const TOP_ROOM = 24;

/** On the home page: the page is at its very top, so the header stays transparent over the first-screen video. */
export function useOverHero(enabled: boolean): boolean {
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    if (!enabled) return;
    const update = () => setAtTop(window.scrollY < TOP_ROOM);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [enabled]);
  return enabled && atTop;
}
