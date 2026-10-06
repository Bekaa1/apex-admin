import type { CSSProperties } from 'react';
import { cx } from './cx';

export interface SkeletonProps {
  variant?: 'line' | 'block' | 'circle';
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  className?: string;
}

/** Placeholder shape while data loads. Mark the loading region with aria-busy; skeletons themselves are hidden. */
export function Skeleton({ variant = 'line', width, height, className }: SkeletonProps) {
  return <span className={cx('ax-skeleton', `ax-skeleton--${variant}`, className)} aria-hidden="true" style={{ width, height }} />;
}
