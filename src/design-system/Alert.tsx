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
  /** A button on the right (wraps under the text on narrow screens), e.g. «Повторить», «Пополнить». */
  action?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  className?: string;
}

/** Form-level or page-level message. Field errors belong on the field (TextField `error`). */
export function Alert({ tone = 'info', title, children, action, onClose, closeLabel = 'Закрыть', className }: AlertProps) {
  const urgent = tone === 'danger' || tone === 'warning';
  return (
    <div className={cx('ax-alert', `ax-alert--${tone}`, action != null && 'ax-alert--with-action', className)} role={urgent ? 'alert' : 'status'}>
      <Icon name={TONE_ICON[tone]} size={22} />
      <div className="ax-alert__content">
        {title ? <p className="ax-alert__title">{title}</p> : null}
        {children ? <p className={title ? 'ax-alert__body' : 'ax-alert__title'}>{children}</p> : null}
      </div>
      {action ? <div className="ax-alert__action">{action}</div> : null}
      {onClose ? <IconButton className="ax-alert__close" variant="ghost" icon="x" label={closeLabel} onClick={onClose} /> : null}
    </div>
  );
}
