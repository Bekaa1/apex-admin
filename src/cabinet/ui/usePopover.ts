import { useEffect, useId, useRef, useState } from 'react';

/** A button with a drop-down panel: a click outside or Esc closes it, Esc returns focus to the button. */
export function usePopover() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return {
    open,
    close: () => setOpen(false),
    rootRef,
    panelId,
    buttonProps: {
      ref: buttonRef,
      'aria-expanded': open,
      'aria-controls': open ? panelId : undefined,
      onClick: () => setOpen((current) => !current),
    },
  };
}
