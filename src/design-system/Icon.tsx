import type { ReactNode } from 'react';
import { cx } from './cx';

/** Outline icons: 24×24 grid, 1.75 stroke, round caps/joins, currentColor. */
const ICONS = {
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  'arrow-left': <path d="M19 12H5M11 18l-6-6 6-6" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx={12} cy={12} r={3} />
    </>
  ),
  'eye-off': (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.9 3.7M6.6 6.6A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5c1.8 0 3.4-.6 4.7-1.4" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  sun: (
    <>
      <circle cx={12} cy={12} r={4} />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  'check-circle': (
    <>
      <circle cx={12} cy={12} r={9} />
      <path d="m8 12.5 2.5 2.5L16 9.5" />
    </>
  ),
  info: (
    <>
      <circle cx={12} cy={12} r={9} />
      <path d="M12 11v5.5M12 7.6v.1" />
    </>
  ),
  'alert-triangle': (
    <>
      <path d="M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4.5M12 17.2v.1" />
    </>
  ),
  'alert-circle': (
    <>
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7.5V13M12 16.4v.1" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  mail: (
    <>
      <rect x={3} y={5} width={18} height={14} rx={2.5} />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  lock: (
    <>
      <rect x={4.5} y={10.5} width={15} height={10} rx={2.5} />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  shelf: (
    <>
      <path d="M4 4v16M20 4v16M4 9h16M4 15h16" />
      <path d="M7 9V6.5h3V9M13 15v-3.5h3V15" />
    </>
  ),
  'map-pin': (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx={12} cy={10} r={2.3} />
    </>
  ),
  chart: <path d="M5 20V11M12 20V5M19 20v-7" />,
  play: <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  globe: (
    <>
      <circle cx={12} cy={12} r={9} />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
      <path d="M20 20v-4h-4" />
    </>
  ),
  home: <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z" />,
  megaphone: (
    <>
      <path d="M4 9.5v5h3l8.5 5v-15L7 9.5z" />
      <path d="M18.5 9a4 4 0 0 1 0 6" />
      <path d="M7 14.5 8.5 20" />
    </>
  ),
  'pie-chart': (
    <>
      <path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5v10z" />
      <path d="M14 3.3a8.5 8.5 0 0 1 6.7 6.7H14z" />
    </>
  ),
  user: (
    <>
      <circle cx={12} cy={8.5} r={3.5} />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  'message-circle': <path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.4a8.5 8.5 0 1 1 15.6-4.6z" />,
  'log-out': (
    <>
      <path d="M9.5 20.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5h3.5" />
      <path d="M15.5 16.5 20 12l-4.5-4.5M20 12H9.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M6 12h12" />,
  'credit-card': (
    <>
      <rect x={3} y={5.5} width={18} height={13} rx={2.5} />
      <path d="M3 10h18M7 15h3" />
    </>
  ),
  video: (
    <>
      <rect x={3} y={6} width={13} height={12} rx={2.5} />
      <path d="m16 10.5 5-3v9l-5-3" />
    </>
  ),
  'shield-check': (
    <>
      <path d="M12 3.5 5 6v5.5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  'trending-up': (
    <>
      <path d="m4 16 6-6 4 4 6-6" />
      <path d="M15 8h5v5" />
    </>
  ),
  wallet: (
    <>
      <path d="M4.5 7.5A2.5 2.5 0 0 1 7 5h10.5v3" />
      <rect x={4.5} y={8} width={16} height={11.5} rx={2.5} />
      <path d="M16 13.75h1.5" />
    </>
  ),
  store: (
    <>
      <path d="M4 9 5.5 4.5h13L20 9v1.5a2.5 2.5 0 0 1-4 2 2.5 2.5 0 0 1-4 0 2.5 2.5 0 0 1-4 0 2.5 2.5 0 0 1-4-2z" />
      <path d="M5.5 13v6.5h13V13M10 19.5v-4h4v4" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;
export const iconNames = Object.keys(ICONS) as IconName[];

export interface IconProps {
  name: IconName;
  /** 20 in buttons and fields, 22 in alerts and chips, 28 in screen icon tiles. */
  size?: number;
  strokeWidth?: number;
  /** Only for a meaningful standalone icon; decorative icons stay hidden from screen readers. */
  title?: string;
  className?: string;
}

export function Icon({ name, size = 20, strokeWidth = 1.75, title, className }: IconProps) {
  return (
    <svg
      className={cx('ax-icon', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {ICONS[name]}
    </svg>
  );
}
