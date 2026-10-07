import type { CSSProperties } from 'react';
import { cx } from './cx';

/** 0 — nothing, 1–5 — from the lightest to the full primary colour. */
export type HeatmapLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface HeatmapRow {
  key: string;
  /** Short row name, e.g. «пн». */
  label: string;
  /** One per column; `title` is the hover tooltip, e.g. «пн, 18:00 — в среднем 250». */
  cells: { level: HeatmapLevel; title: string }[];
}

export interface HeatmapProps {
  /** Column captions; an empty string leaves the column unlabelled. */
  columns: string[];
  rows: HeatmapRow[];
  /** The whole picture in words for screen readers. */
  label: string;
  legend: { less: string; more: string };
  className?: string;
}

const LEGEND_LEVELS: HeatmapLevel[] = [1, 2, 3, 4, 5];

/** Grid of shaded cells, e.g. plays by weekday and hour. Read as one image: the summary goes into `label`. */
export function Heatmap({ columns, rows, label, legend, className }: HeatmapProps) {
  const style: CSSProperties & { '--cols': number } = { '--cols': columns.length };
  return (
    <figure className={cx('ax-heat', className)} role="img" aria-label={label} style={style}>
      <div className="ax-heat__grid">
        <span />
        {columns.map((column, index) => (
          <span key={index} className="ax-heat__col">
            {column}
          </span>
        ))}
        {rows.map((row) => (
          <div key={row.key} className="ax-heat__row">
            <span className="ax-heat__rowlabel">{row.label}</span>
            {row.cells.map((cell, index) => (
              <span key={index} className="ax-heat__cell" data-l={cell.level} title={cell.title} />
            ))}
          </div>
        ))}
      </div>
      <figcaption className="ax-heat__legend" aria-hidden="true">
        <span>{legend.less}</span>
        {LEGEND_LEVELS.map((level) => (
          <span key={level} className="ax-heat__cell" data-l={level} />
        ))}
        <span>{legend.more}</span>
      </figcaption>
    </figure>
  );
}
