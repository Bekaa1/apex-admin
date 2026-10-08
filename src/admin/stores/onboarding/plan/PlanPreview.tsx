import { useRef, useState, type PointerEvent } from 'react';
import { Button } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { type Kind, type PlanDocument } from './model';
import styles from './StorePlan.module.css';

const PALETTE: Record<Kind, string> = {
  shelf: 'primary', rack: 'success', wall_shelf: 'accent', island: 'warning', fridge: 'brand-cyan', freezer: 'primary',
  display: 'accent', counter: 'warning', checkout: 'success', pallet: 'text-muted', section: 'primary', promo: 'danger', entrance: 'success', other: 'text-subtle',
};
const mix = (kind: Kind) => `color-mix(in srgb, var(--${PALETTE[kind]}) 22%, var(--surface))`;

interface Area { x: number; y: number; width: number; height: number }
interface Interaction {
  selectedId: string | null;
  colors: Map<string, string>;
  labels: Map<string, string>;
  unassigned: string;
  invalidIds?: Set<string>;
  onElement: (id: string) => void;
  onArea?: (area: Area) => void;
}
export function PlanPreview({ plan, interaction, coloring, compact = false }: {
  plan: PlanDocument; interaction?: Interaction; coloring?: Pick<Interaction, 'colors' | 'labels' | 'unassigned'>; compact?: boolean;
}) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState(1);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; pointer: number } | null>(null);
  const [selection, setSelection] = useState<Area | null>(null);
  const kinds = [...new Set(plan.elements.map(element => element.kind))];
  const appearance = interaction ?? coloring;
  function fit() { setZoom(1); viewport.current?.scrollTo({ left: 0, top: 0 }); }
  function point(event: PointerEvent<SVGSVGElement>) {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: Math.max(0, Math.min(plan.width, p.x)), y: Math.max(0, Math.min(plan.height, p.y)) };
  }
  function rectangle(p: { x: number; y: number }): Area | null {
    const start = drag.current;
    return start ? { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), width: Math.abs(start.x - p.x), height: Math.abs(start.y - p.y) } : null;
  }
  return <section className={styles.preview} aria-label={t('adminStorePlan.preview')}>
    <div className={styles.toolbar}>
      <p>{t('adminStorePlan.dimensions', { width: plan.width, height: plan.height, count: plan.elements.length })}</p>
      <div className={styles.controls}>
        <Button size="md" variant="secondary" disabled={zoom <= 0.5} aria-label={t('adminStorePlan.zoomOut')} onClick={() => setZoom(value => Math.max(0.5, value - 0.5))}>−</Button>
        <output aria-label={t('adminStorePlan.zoom')}>{Math.round(zoom * 100)}%</output>
        <Button size="md" variant="secondary" disabled={zoom >= 4} aria-label={t('adminStorePlan.zoomIn')} onClick={() => setZoom(value => Math.min(4, value + 0.5))}>+</Button>
        <Button size="md" variant="secondary" onClick={fit}>{t('adminStorePlan.fit')}</Button>
      </div>
    </div>
    <div className={`${styles.viewport} ${compact ? styles.compact : ''}`} ref={viewport} tabIndex={0} role="region" aria-label={t('adminStorePlan.preview')}>
      <svg role={interaction ? 'group' : 'img'} aria-label={t('adminStorePlan.dimensions', { width: plan.width, height: plan.height, count: plan.elements.length })}
        width={`${zoom * 100}%`} height={`${zoom * 100}%`} viewBox={`0 0 ${plan.width} ${plan.height}`} preserveAspectRatio="xMidYMid meet"
        style={interaction?.onArea ? { touchAction: 'none', cursor: 'crosshair' } : undefined}
        onPointerDown={event => {
          if (!interaction?.onArea || event.button !== 0 || !event.isPrimary) return;
          const p = point(event); if (!p) return;
          event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { ...p, pointer: event.pointerId }; setSelection({ ...p, width: 0, height: 0 });
        }}
        onPointerMove={event => { if (drag.current?.pointer === event.pointerId) { const p = point(event); if (p) setSelection(rectangle(p)); } }}
        onPointerUp={event => {
          if (drag.current?.pointer !== event.pointerId) return;
          const p = point(event), area = p && rectangle(p);
          drag.current = null; setSelection(null);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          if (area && area.width > 0 && area.height > 0) interaction?.onArea?.(area);
        }}
        onPointerCancel={() => { drag.current = null; setSelection(null); }}
        onLostPointerCapture={() => { drag.current = null; setSelection(null); }}>
        <rect width={plan.width} height={plan.height} fill="var(--surface)" stroke="var(--border-strong)" vectorEffect="non-scaling-stroke" />
        {plan.elements.map(element => {
          const label = element.label || element.id;
          const color = appearance?.colors.get(element.id);
          const selected = interaction?.selectedId === element.id, invalid = interaction?.invalidIds?.has(element.id);
          const caption = `${element.id}: ${label} (${t(`adminStorePlan.kind.${element.kind}`)})${appearance ? ` — ${appearance.labels.get(element.id) ?? appearance.unassigned}` : ''}`;
          const fontSize = Math.min(Math.max(plan.width, plan.height) / 60, element.height * 0.42, element.width / Math.max(Array.from(label).length, 1) * 1.25);
          return <svg key={element.id} x={element.x} y={element.y} width={element.width} height={element.height} viewBox={`0 0 ${element.width} ${element.height}`} overflow="visible"
            className={interaction ? styles.element : undefined} role={interaction ? 'button' : undefined} tabIndex={interaction ? 0 : undefined}
            aria-label={interaction ? caption : undefined} aria-pressed={interaction ? selected : undefined}
            onPointerDown={() => { if (interaction?.onArea) interaction.onElement(element.id); }}
            onClick={() => interaction?.onElement(element.id)}
            onKeyDown={event => { if (interaction && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); interaction.onElement(element.id); } }}>
            <title>{caption}</title>
            <rect width={element.width} height={element.height} fill={appearance ? (color && /^#[0-9a-f]{6}$/i.test(color) ? `color-mix(in srgb, ${color} 35%, var(--surface))` : 'var(--surface-muted)') : mix(element.kind)}
              stroke={invalid ? 'var(--danger)' : selected ? 'var(--primary)' : color && /^#[0-9a-f]{6}$/i.test(color) ? color : appearance ? 'var(--text-muted)' : `var(--${PALETTE[element.kind]})`}
              strokeWidth={selected || invalid ? 3 : 1} strokeDasharray={appearance && !color ? '4 3' : undefined} vectorEffect="non-scaling-stroke" />
            <text x={element.width / 2} y={element.height / 2} fontSize={fontSize} textAnchor="middle" dominantBaseline="middle" fill="var(--text)">{label}</text>
          </svg>;
        })}
        {selection && <rect {...selection} fill="color-mix(in srgb, var(--primary) 12%, transparent)" stroke="var(--primary)" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
      </svg>
    </div>
    {!appearance && <ul className={styles.legend}>{kinds.map(kind => <li key={kind}><span aria-hidden="true" style={{ background: mix(kind), borderColor: `var(--${PALETTE[kind]})` }} />{t(`adminStorePlan.kind.${kind}`)}</li>)}</ul>}
  </section>;
}
