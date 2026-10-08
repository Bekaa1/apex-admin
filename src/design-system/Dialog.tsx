import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';

export type DialogTone = 'brand' | 'warning' | 'danger';

export interface DialogProps {
  open: boolean;
  title: ReactNode;
  /** Icon tile above the title. */
  icon?: IconName;
  tone?: DialogTone;
  children?: ReactNode;
  /** Buttons: the safe one first with `data-autofocus`, the main one last (on phones they stack, main on top). */
  actions: ReactNode;
  closeLabel: string;
  /** Esc, the backdrop and × all end up here. */
  onClose: () => void;
}

/** Confirmation over the page (kit v4.3), a bottom sheet on phones. A native modal `<dialog>`: focus stays inside, Esc closes. */
export function Dialog({ open, title, icon, tone = 'brand', children, actions, closeLabel, onClose }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog ref={ref} className="ax-dialog" aria-labelledby={titleId} onClose={onClose}>
      <div className="ax-dialog__backdrop" aria-hidden="true" onClick={() => ref.current?.close()} />
      <div className="ax-dialog__panel">
        <IconButton variant="ghost" className="ax-dialog__close" icon="x" label={closeLabel} onClick={() => ref.current?.close()} />
        {icon ? (
          <span className={`ax-dialog__icon ax-dialog__icon--${tone}`} aria-hidden="true">
            <Icon name={icon} size={26} />
          </span>
        ) : null}
        <h2 className="ax-dialog__title" id={titleId}>
          {title}
        </h2>
        {children ? <div className="ax-dialog__body">{children}</div> : null}
        <div className="ax-dialog__actions">{actions}</div>
      </div>
    </dialog>
  );
}
