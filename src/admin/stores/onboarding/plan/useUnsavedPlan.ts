import { useCallback, useRef } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router';

export function useUnsavedPlan(dirty: boolean, busy: boolean) {
  const bypass = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !bypass.current && (dirty || busy)
    && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  useBeforeUnload(useCallback((event: BeforeUnloadEvent) => {
    if (!bypass.current && (dirty || busy)) { event.preventDefault(); event.returnValue = ''; }
  }, [dirty, busy]));
  return { blocker, guard: () => { bypass.current = false; }, allow: () => { bypass.current = true; } };
}
