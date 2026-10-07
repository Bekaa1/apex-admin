import { useId } from 'react';
import { BarList } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatNumber, formatPercent, pluralKey } from '../../lib/format';
import { ChangeDelta } from './ChangeDelta';
import type { ZonesSummary } from './types';

/** «Показы у полок»: plays at the chosen shelf zones vs the general rotation, and each zone. */
export function ZonesCard({ zones }: { zones: ZonesSummary }) {
  const { t, lang } = useI18n();
  const titleId = useId();
  const total = zones.zones + zones.rotation;
  const atZones = total > 0 ? zones.zones / total : 0;
  const zonesPct = formatPercent(atZones, lang);
  const rotationPct = formatPercent(1 - atZones, lang);
  const top = zones.lines[0]?.plays ?? 0;
  return (
    <section className="cab-card st-card" aria-labelledby={titleId}>
      <div className="st-card__head">
        <div className="st-card__copy">
          <h2 className="cab-h3" id={titleId}>
            {t('stats.zones.title')}
          </h2>
          <p className="cab-small">{t('stats.zones.lead')}</p>
        </div>
      </div>
      <div className="st-split">
        <div className="st-split__bar" role="img" aria-label={t('stats.zones.split', { zones: zonesPct, rotation: rotationPct })}>
          <span className="st-split__zones" style={{ width: `${atZones * 100}%` }} />
          <span className="st-split__rot" style={{ width: `${(1 - atZones) * 100}%` }} />
        </div>
        <ul className="st-legend" aria-hidden="true">
          <li>
            <span className="st-legend__key st-legend__key--zones" />
            {t('stats.zones.atShelves')} <strong>{zonesPct}</strong> · {formatNumber(zones.zones, lang)}
          </li>
          <li>
            <span className="st-legend__key st-legend__key--rot" />
            {t('stats.zones.rotation')} <strong>{rotationPct}</strong> · {formatNumber(zones.rotation, lang)}
          </li>
        </ul>
      </div>
      {zones.lines.length ? (
        <BarList
          label={t('stats.zones.listLabel')}
          items={zones.lines.map((line) => ({
            key: line.name,
            name: line.name,
            sub: t(pluralKey('stats.zones.stores', line.stores, lang), { count: formatNumber(line.stores, lang) }),
            value: (
              <>
                {formatNumber(line.plays, lang)}
                <ChangeDelta change={line.change} />
              </>
            ),
            share: top > 0 ? line.plays / top : 0,
          }))}
        />
      ) : null}
    </section>
  );
}
