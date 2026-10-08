import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';

export interface MenuItem {
  key: string;
  label: ReactNode;
  icon?: IconName;
  tone?: 'danger';
  onSelect: () => void;
}

export interface MenuProps {
  /** Accessible name of the «⋯» button and the list, e.g. «Ещё действия: Летний лимонад». */
  label: string;
  items: MenuItem[];
  /** Which edge of the button the list lines up with. */
  align?: 'start' | 'end';
  className?: string;
}

/** «⋯» button with a list of secondary actions. Arrows move between items, Esc closes and returns to the button. */
export function Menu({ label, items, align = 'end', className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const options = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = options.findIndex((option) => option === document.activeElement);
    if (event.key === 'ArrowDown') options[(index + 1) % options.length]?.focus();
    else if (event.key === 'ArrowUp') options[(index - 1 + options.length) % options.length]?.focus();
    else if (event.key === 'Home') options[0]?.focus();
    else if (event.key === 'End') options[options.length - 1]?.focus();
    else if (event.key === 'Escape') close();
    else {
      if (event.key === 'Tab') setOpen(false);
      return;
    }
    event.preventDefault();
  };

  return (
    <div ref={rootRef} className={cx('ax-menu', `ax-menu--${align}`, open && 'is-open', className)}>
      <button
        ref={buttonRef}
        type="button"
        className="ax-iconbtn"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' || open) return;
          event.preventDefault();
          setOpen(true);
        }}
      >
        <Icon name="more" />
      </button>
      {open ? (
        <div ref={listRef} id={listId} className="ax-menu__list" role="menu" aria-label={label} onKeyDown={onListKeyDown}>
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={cx('ax-menu__item', item.tone === 'danger' && 'ax-menu__item--danger')}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon ? <Icon name={item.icon} size={18} /> : null}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
