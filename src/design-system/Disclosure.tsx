import type { ReactNode } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';

export interface DisclosureProps {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

/** One question of a FAQ list, built on native details/summary. */
export function Disclosure({ summary, children, defaultOpen }: DisclosureProps) {
  return (
    <details className="ax-disclosure" open={defaultOpen}>
      <summary className="ax-disclosure__summary">
        <span>{summary}</span>
        <Icon name="chevron-down" className="ax-disclosure__chevron" />
      </summary>
      <div className="ax-disclosure__body">{children}</div>
    </details>
  );
}

export function DisclosureGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('ax-disclosure-group', className)}>{children}</div>;
}
