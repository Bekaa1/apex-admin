import { useRef, useState } from 'react';
import { Button, IconButton } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { zoneBoxes, type StoreMap } from '../storePlan';
import type { CatalogZone } from '../types';

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.5;

interface ZoneShapesProps {
  zone: CatalogZone;
  shelves: StoreMap['shelves'];
  /** The zone's colour on the plan; without one the brand colour (CSS). */
  color: string | undefined;
  pressed: boolean;
  onToggle: () => void;
}

/** One zone's shelves as one button: a single tab stop, and a tap on any of its shelves toggles the zone. */
function ZoneShapes({ zone, shelves, color, pressed, onToggle }: ZoneShapesProps) {
  return (
    <g
      className={pressed ? 'cmp-map__zone is-pressed' : 'cmp-map__zone'}
      style={color ? { fill: color } : undefined}
      role="button"
      tabIndex={0}
      aria-pressed={pressed}
      aria-label={zone.name}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onToggle();
      }}
    >
      <title>{zone.name}</title>
      {shelves.map(({ id, ...shelf }) => (
        <rect key={id} className="cmp-map__shelf" {...shelf} vectorEffect="non-scaling-stroke" />
      ))}
      {/* Shelves are a few pixels thick on a whole-hall view; a wide transparent stroke makes them tappable. */}
      {shelves.map(({ id, ...shelf }) => (
        <rect key={`hit:${id}`} className="cmp-map__hit" {...shelf} vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
}

interface ZoneMapProps {
  map: StoreMap;
  /** Zones of this store on sale; the map lights up those that have shelves on the plan. */
  zones: CatalogZone[];
  selected: string[];
  storeName: string;
  onToggle: (zoneId: string) => void;
}

/** The hall of one store: zones on sale in their plan colours, faint until chosen; a tap on a shelf picks or drops its zone. Same state as the zone chips. */
export function ZoneMap({ map, zones, selected, storeName, onToggle }: ZoneMapProps) {
  const { t } = useI18n();
  const [zoom, setZoom] = useState(ZOOM_MIN);
  const viewport = useRef<HTMLDivElement>(null);
  const boxes = zoneBoxes(map);
  const onMap = zones.filter((zone) => boxes.has(zone.id));
  const lit = new Set(onMap.map((zone) => zone.id));
  const shelvesOf = (zoneId: string) => map.shelves.filter((shelf) => map.zoneOf.get(shelf.id) === zoneId);
  // Shelves outside zones on sale (no beacon there yet) are part of the hall, not choices.
  const plain = map.shelves.filter((shelf) => !lit.has(map.zoneOf.get(shelf.id) ?? ''));
  const fontSize = Math.max(map.width, map.height) / 42;

  // Zooming keeps the same spot in the middle of the window.
  const zoomTo = (next: number) => {
    const view = viewport.current;
    const middle = view && { x: (view.scrollLeft + view.clientWidth / 2) / view.scrollWidth, y: (view.scrollTop + view.clientHeight / 2) / view.scrollHeight };
    setZoom(next);
    if (!view || !middle) return;
    requestAnimationFrame(() => {
      view.scrollLeft = middle.x * view.scrollWidth - view.clientWidth / 2;
      view.scrollTop = middle.y * view.scrollHeight - view.clientHeight / 2;
    });
  };

  return (
    <section className="cmp-map" aria-label={t('campaigns.wizard.zones.map.aria', { store: storeName })}>
      <div className="cmp-map__bar">
        <p className="cab-small">{t('campaigns.wizard.zones.map.hint')}</p>
        <div className="cmp-map__zoom">
          <IconButton icon="minus" label={t('campaigns.wizard.zones.map.zoomOut')} disabled={zoom <= ZOOM_MIN} onClick={() => zoomTo(Math.max(ZOOM_MIN, zoom - ZOOM_STEP))} />
          <IconButton icon="plus" label={t('campaigns.wizard.zones.map.zoomIn')} disabled={zoom >= ZOOM_MAX} onClick={() => zoomTo(Math.min(ZOOM_MAX, zoom + ZOOM_STEP))} />
          <Button variant="ghost" size="md" disabled={zoom === ZOOM_MIN} onClick={() => zoomTo(ZOOM_MIN)}>
            {t('campaigns.wizard.zones.map.fit')}
          </Button>
        </div>
      </div>
      <div className="cmp-map__viewport" ref={viewport} style={{ aspectRatio: `${map.width} / ${map.height}` }}>
        <svg className="cmp-map__canvas" role="group" viewBox={`0 0 ${map.width} ${map.height}`} style={{ width: `${zoom * 100}%` }}>
          <rect className="cmp-map__hall" width={map.width} height={map.height} vectorEffect="non-scaling-stroke" />
          {map.walls.map((wall, index) => (
            // Outlines never change while the map is shown, so their order is a stable key.
            <rect key={index} className="cmp-map__wall" {...wall} />
          ))}
          {plain.map(({ id, ...shelf }) => (
            <rect key={id} className="cmp-map__plain" {...shelf} vectorEffect="non-scaling-stroke" />
          ))}
          {onMap.map((zone) => (
            <ZoneShapes
              key={zone.id}
              zone={zone}
              shelves={shelvesOf(zone.id)}
              color={map.zoneColor.get(zone.id)}
              pressed={selected.includes(zone.id)}
              onToggle={() => onToggle(zone.id)}
            />
          ))}
          {/* Zones are told apart by colour (the dots on the chips); names only for the chosen ones, so a busy hall stays readable. */}
          {onMap.map((zone) => {
            const box = selected.includes(zone.id) ? boxes.get(zone.id) : undefined;
            return box ? (
              <text key={zone.id} className="cmp-map__label" x={box.x + box.width / 2} y={box.y + box.height / 2} fontSize={fontSize} strokeWidth={fontSize / 4} aria-hidden="true">
                {zone.name}
              </text>
            ) : null;
          })}
        </svg>
      </div>
    </section>
  );
}
