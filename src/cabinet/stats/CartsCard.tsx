import { useId } from 'react';
import { Delta, Icon, Meter } from '../../design-system';
import { useI18n } from '../../i18n/i18n';
import { formatDelta, formatNumber, formatPercent } from '../../lib/format';
import { deltaTone, deltaTrend } from '../charts';
import type { CartsSummary } from './types';

/** Cart screens in the campaigns' stores: online now, how many showed the videos in the period, where most are offline. */
export function CartsCard({ carts, single }: { carts: CartsSummary; single: boolean }) {
  const { t, lang } = useI18n();
  const titleId = useId();
  const pct = formatPercent(carts.online / carts.total, lang);
  return (
    <section className="cab-card st-card st-carts" aria-labelledby={titleId}>
      <div className="st-card__head">
        <div className="st-card__copy">
          <h2 className="cab-h3" id={titleId}>
            {t('stats.carts.title')}
          </h2>
          <p className="cab-small">{t(single ? 'stats.carts.leadCampaign' : 'stats.carts.lead')}</p>
        </div>
      </div>
      <div className="st-carts__now">
        <p className="st-carts__big">
          <strong>{formatNumber(carts.online, lang)}</strong>
          <span>{t('stats.carts.now', { total: formatNumber(carts.total, lang) })}</span>
        </p>
        <Meter value={(carts.online / carts.total) * 100} tone="success" label={t('stats.carts.meterLabel', { pct })} />
      </div>
      <dl className="st-facts">
        <div>
          <dt className="is-online">
            <Icon name="wifi" size={16} />
            {t('stats.carts.online')}
          </dt>
          <dd>{formatNumber(carts.online, lang)}</dd>
        </div>
        <div>
          <dt className="is-offline">
            <Icon name="wifi-off" size={16} />
            {t('stats.carts.offline')}
          </dt>
          <dd>{formatNumber(carts.total - carts.online, lang)}</dd>
        </div>
        {carts.worked ? (
          <div>
            <dt>
              <Icon name="clock" size={16} />
              {t('stats.carts.worked')}
            </dt>
            <dd>
              {formatPercent(carts.worked.share, lang)}
              {carts.worked.change === null ? null : (
                <Delta tone={deltaTone(carts.worked.change)} trend={deltaTrend(carts.worked.change)}>
                  {formatDelta(carts.worked.change, lang)}
                </Delta>
              )}
            </dd>
          </div>
        ) : null}
      </dl>
      {carts.worst.length ? (
        <div className="st-carts__worst">
          <p className="cab-overline">{t('stats.carts.worst')}</p>
          <ul>
            {carts.worst.map((store) => (
              <li key={store.id}>
                <span>{store.name}</span>
                <strong>{t('stats.carts.worstCount', { count: formatNumber(store.offline, lang) })}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="cab-note">
        <Icon name="info" size={18} />
        {t('stats.carts.note')}
      </p>
    </section>
  );
}
