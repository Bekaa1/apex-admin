import { cx } from './cx';

export interface AvatarProps {
  /** One or two letters. */
  initials: string;
  size?: number;
  className?: string;
}

/** Decorative initials circle; the name next to it carries the meaning. */
export function Avatar({ initials, size = 36, className }: AvatarProps) {
  return (
    <span className={cx('ax-avatar', className)} aria-hidden="true" style={{ width: size, height: size, fontSize: Math.round(size * 0.39) }}>
      {initials}
    </span>
  );
}
