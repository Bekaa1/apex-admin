import { useId, useState } from 'react';
import { Button, Icon } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatNumber, pluralKey } from '../../../lib/format';
import type { CampaignDetails } from './types';

const SHOWN_STORES = 5;

export function DetailsStores({ details }: { details: CampaignDetails }) {
  const { t, lang } = useI18n();
  const titleId = useId();
  const [all, setAll] = useState(false);
  const { stores, hasZones } = details;
  const count = (key: string, n: number) => t(pluralKey(key, n, lang), { count: formatNumber(n, lang) });
  const shown = all ? stores : stores.slice(0, SHOWN_STORES);
  const summary = [details.storesCount === null ? null : count('campaigns.row.stores', details.storesCount), details.cartsCount === null ? null : count('campaigns.row.carts', details.cartsCount)]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="cab-card cmpd-card cmpd-card--stores" aria-labelledby={titleId}>
      <div className="cmpd-card__head">
        <h2 className="cab-h3" id={titleId}>
          {t(hasZones ? 'campaigns.details.stores.titleZones' : 'campaigns.details.stores.title')}
        </h2>
        {summary ? <span className="cab-small">{summary}</span> : null}
      </div>
      {stores.length ? (
        <ul className="cmpd-stores">
          {shown.map((store) => (
            <li key={store.id} className="cmpd-store">
              <div className="cmpd-store__main">
                <strong>{store.name}</strong>
                {store.address ? <span>{store.address}</span> : null}
              </div>
              {store.carts === null ? null : (
                <span className="cmpd-store__carts">
                  <Icon name="cart" size={18} />
                  {formatNumber(store.carts, lang)}
                  <span className="ax-sr"> {t(pluralKey('campaigns.details.stores.cartsUnit', store.carts, lang))}</span>
                </span>
              )}
              {hasZones && store.zones.length ? (
                <ul className="cmpd-zones" aria-label={t('campaigns.steps.zones')}>
                  {store.zones.map((zone) => (
                    <li key={zone} className="cmpd-zone">
                      {zone}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="cab-small">{t('campaigns.details.stores.none')}</p>
      )}
      {stores.length > SHOWN_STORES ? (
        <Button className="cmpd-more" variant="ghost" size="md" iconRight={all ? undefined : 'chevron-down'} aria-expanded={all} onClick={() => setAll((value) => !value)}>
          {all ? t('campaigns.details.stores.less') : t('campaigns.details.stores.all', { count: formatNumber(stores.length, lang) })}
        </Button>
      ) : null}
      {hasZones ? null : (
        <p className="cab-note">
          <Icon name="info" size={18} />
          {t('campaigns.details.stores.noZones')}
        </p>
      )}
    </section>
  );
}
