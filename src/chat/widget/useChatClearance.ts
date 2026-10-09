import { useEffect, type RefObject } from 'react';
import { chatBottomClearance } from './clearance';

/** Existing shared bars; optional marker lets new layouts declare a bottom obstruction. */
const selector = '.cab-tabs, .cmp-actions, [data-chat-obstacle]';
export function useChatClearance(frame: RefObject<HTMLDivElement | null>, page: RefObject<HTMLDivElement | null>, locationKey: string) {
  useEffect(() => {
    const root = frame.current, content = page.current;
    if (!root || !content) return;
    let raf = 0;
    let observed: HTMLElement[] = [];
    const measure = () => {
      raf = 0;
      const elements = Array.from(content.querySelectorAll<HTMLElement>(selector));
      if (elements.length !== observed.length || elements.some((el, i) => el !== observed[i])) {
        observed.forEach(el => resize.unobserve(el));
        elements.forEach(el => resize.observe(el));
        observed = elements;
      }
      const obstacles = elements.flatMap(el => {
        const css = getComputedStyle(el);
        return ['fixed', 'sticky'].includes(css.position) && css.visibility !== 'hidden' ? [el.getBoundingClientRect()] : [];
      });
      const bottom = chatBottomClearance(document.documentElement.clientWidth, window.innerHeight, obstacles);
      root.style.setProperty('--chat-obstacle-bottom', `${bottom}px`);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };
    const resize = new ResizeObserver(schedule);
    const mutations = new MutationObserver(schedule);
    resize.observe(content);
    mutations.observe(content, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'open'] });
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.visualViewport?.addEventListener('resize', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(raf); resize.disconnect(); mutations.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule);
    };
  }, [frame, page, locationKey]);
}
