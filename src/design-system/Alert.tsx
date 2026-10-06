import type { ReactNode } from 'react';
import { cx } from './cx';
import { Icon, type IconName } from './Icon';
import { IconButton } from './IconButton';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';
const TONE_ICON: Record<AlertTone, IconName> = { info: 'info', success: 'check-circle', warning: 'alert-triangle', danger: 'alert-circle' };

export interface AlertProps {
  tone?: AlertTone;
  /** What happened. */
  title?: ReactNode;
  /** What to do next. */
  children?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  className?: string;
}

/** Form-level or page-level message. Field errors belong on the field (TextField `error`). */
export function Alert({ tone = 'info', title, children, onClose, closeLabel = 'Закрыть', className }: AlertProps) {
  const urgent = tone === 'danger' || tone === 'warning';
  return (
    <div className={cx('ax-alert', `ax-alert--${tone}`, className)} role={urgent ? 'alert' : 'status'}>
      <Icon name={TONE_ICON[tone]} size={22} />
      <div>
        {title ? <p className="ax-alert__title">{title}</p> : null}
        {children ? <p className={title ? 'ax-alert__body' : 'ax-alert__title'}>{children}</p> : null}
      </div>
      {onClose ? <IconButton className="ax-alert__close" variant="ghost" icon="x" label={closeLabel} onClick={onClose} /> : null}
    </div>
  );
}
