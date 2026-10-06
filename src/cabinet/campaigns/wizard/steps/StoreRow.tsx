import { Icon } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { formatNumber, pluralKey } from '../../../../lib/format';
import type { CatalogStore } from '../types';

interface StoreRowProps {
  store: CatalogStore;
  zones: number;
  checked: boolean;
  onToggle: () => void;
}

/** A store as a checkbox row: name and address, city, carts, campaigns now and shelf zones. */
export function StoreRow({ store, zones, checked, onToggle }: StoreRowProps) {
  const { t, lang } = useI18n();
  const count = (key: string, n: number) => t(pluralKey(key, n, lang), { count: formatNumber(n, lang) });
  const cartsUnit = store.carts === null ? '' : t(pluralKey('campaigns.row.carts', store.carts, lang), { count: '' }).trim();
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
      <span className="cmp-store__carts cmp-num">
        {store.carts === null ? (
          <span className="cab-subtle">—</span>
        ) : (
          <>
            <Icon name="cart" size={16} />
            {formatNumber(store.carts, lang)}
            <span className="cmp-store__unit"> {cartsUnit}</span>
          </>
        )}
      </span>
      <span className="cmp-store__load">
        {store.activeCampaigns === null ? null : count('campaigns.wizard.stores.campaignsNow', store.activeCampaigns)}
        <span className="cmp-store__zones">{count('campaigns.wizard.stores.zonesAtShelves', zones)}</span>
      </span>
    </label>
  );
}
