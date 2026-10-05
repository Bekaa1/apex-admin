import { useId } from 'react';
import { cx } from './cx';

const FACETS = [
  { points: '743,328 1208,1055 962,1055 829,847 621,508', g: 'b', whiteOpacity: 1 },
  { points: '663,847 829,847 962,1055 904,1055', g: 'd', whiteOpacity: 0.72 },
  { points: '630,144 743,328 621,508 416,820 113,935', g: 'a', whiteOpacity: 0.86 },
  { points: '113,935 698,714 243,1055 31,1055', g: 'c', whiteOpacity: 0.62 },
] as const;

const GRADIENTS = {
  a: { x1: 630, y1: 144, x2: 113, y2: 935, stops: [[0, '#01d8fc'], [0.35, '#03aefc'], [0.8, '#0468fc'], [1, '#055bfb']] },
  b: { x1: 680, y1: 420, x2: 1180, y2: 1055, stops: [[0, '#0530f8'], [0.45, '#3d2cfd'], [0.85, '#b01efd'], [1, '#df13fc']] },
  c: { x1: 60, y1: 1050, x2: 698, y2: 714, stops: [[0, '#0423e7'], [0.35, '#0233f2'], [1, '#0a7cf9']] },
  d: { x1: 663, y1: 847, x2: 930, y2: 1055, stops: [[0, '#0343fc'], [1, '#7a1cfb']] },
} as const;

export interface LogoMarkProps {
  /** Mark height in px (28–30 in headers, min 20). */
  size?: number;
  /** color — any background except brand blue; white — only on brand blue or photos. */
  variant?: 'color' | 'white';
}

/** The Apex mark (same geometry as assets/logo/apex-mark.svg), inline so it needs no asset pipeline. */
export function LogoMark({ size = 28, variant = 'color' }: LogoMarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const white = variant === 'white';
  return (
    <svg viewBox="20 134 1200 932" height={size} width={Math.round((size * 1200) / 932)} aria-hidden="true" focusable="false" style={{ display: 'block', flex: 'none' }}>
      {white ? null : (
        <defs>
          {Object.entries(GRADIENTS).map(([k, g]) => (
            <linearGradient key={k} id={uid + k} gradientUnits="userSpaceOnUse" x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>
              {g.stops.map(([offset, color]) => (
                <stop key={offset} offset={offset} stopColor={color} />
              ))}
            </linearGradient>
          ))}
        </defs>
      )}
      {FACETS.map((f) => (
        <polygon key={f.g} points={f.points} fill={white ? '#ffffff' : `url(#${uid}${f.g})`} fillOpacity={white ? f.whiteOpacity : undefined} />
      ))}
    </svg>
  );
}

export interface LogoProps extends LogoMarkProps {
  /** Show the «apexmedia» wordmark next to the mark. */
  wordmark?: boolean;
  /** Renders as a link (usually to the home page). */
  href?: string;
  label?: string;
  className?: string;
}

export function Logo({ size = 28, variant = 'color', wordmark = true, href, label = 'Apexmedia', className }: LogoProps) {
  const cls = cx('ax-logo', variant === 'white' && 'ax-logo--white', className);
  const content = (
    <>
      <LogoMark size={size} variant={variant} />
      {wordmark ? (
        <span className="ax-logo__word" style={{ fontSize: Math.round(size * 0.72) }}>
          apexmedia
        </span>
      ) : null}
    </>
  );
  return href ? (
    <a className={cls} href={href} aria-label={label}>
      {content}
    </a>
  ) : (
    <span className={cls} role="img" aria-label={label}>
      {content}
    </span>
  );
}
