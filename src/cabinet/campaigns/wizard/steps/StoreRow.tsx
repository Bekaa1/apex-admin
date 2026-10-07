import { Icon } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { formatNumber, pluralKey } from '../../../../lib/format';
import type { CatalogStore } from '../types';

interface StoreRowProps {
  store: CatalogStore;
  zones: number;
  /** The carts column is shown only when every store reports its carts. */
  showCarts: boolean;
  checked: boolean;
  onToggle: () => void;
}

/** A store as a checkbox row: name and address, city, carts, campaigns now and shelf zones. */
export function StoreRow({ store, zones, showCarts, checked, onToggle }: StoreRowProps) {
  const { t, lang } = useI18n();
  const count = (key: string, n: number) => t(pluralKey(key, n, lang), { count: formatNumber(n, lang) });
  const carts = store.carts ?? 0;
  return (
    <label className={checked ? 'ax-check cmp-store is-checked' : 'ax-check cmp-store'}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span className="cmp-store__main">
        <span className="cmp-store__name">{store.name}</span>
        {store.address ? (
          <span className="cmp-store__address">
            <Icon name="map-pin" size={14} />
            {store.address}
          </span>
        ) : null}
      </span>
      <span className="cmp-store__city">{store.city ?? '—'}</span>
      {showCarts ? (
        <span className="cmp-store__carts cmp-num">
          <Icon name="cart" size={16} />
          {formatNumber(carts, lang)}
          <span className="cmp-store__unit"> {t(pluralKey('campaigns.row.carts', carts, lang), { count: '' }).trim()}</span>
        </span>
      ) : null}
      <span className="cmp-store__load">
        {store.activeCampaigns === null ? null : count('campaigns.wizard.stores.campaignsNow', store.activeCampaigns)}
        <span className="cmp-store__zones">{count('campaigns.wizard.stores.zonesAtShelves', zones)}</span>
      </span>
    </label>
  );
}
