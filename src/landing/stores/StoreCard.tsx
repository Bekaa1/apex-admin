import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Icon } from '../../design-system';
import { useAuthSession } from '../../auth/useAuthSession';
import { useI18n } from '../../i18n/i18n';
import { formatNumber } from '../../lib/format';
import { CampaignLink } from '../CampaignLink';
import { fetchStoreZones, type PublicStore } from './api';
import styles from '../PublicPages.module.css';

export function StoreCard({ store }: { store: PublicStore }) {
  const { t, lang } = useI18n();
  const { session } = useAuthSession();
  const [expanded, setExpanded] = useState(false);
  const zones = useQuery({ queryKey: ['public-store-zones', session?.user.id ?? 'guest', store.id], queryFn: ({ signal }) => fetchStoreZones(store.id, signal), enabled: expanded, staleTime: 300_000, retry: 1 });
  const address = [store.city, store.address].filter(Boolean).join(', ');
  return <article className={styles.storeCard}>
    <div className={styles.storeTop}><span className={styles.iconTile}><Icon name="store" size={26} /></span>{store.city ? <span className={styles.cityTag}>{store.city}</span> : null}</div>
    <h2>{store.name}</h2>
    <p className={styles.address}><Icon name="map-pin" size={17} /><span>{address || t('public.stores.addressMissing')}</span></p>
    <dl className={styles.storeMetrics}>
      <div><dt>{t('public.stores.screens')}</dt><dd>{store.cart_count === null ? '—' : formatNumber(store.cart_count, lang)}</dd></div>
      <div><dt>{t('public.stores.zones')}</dt><dd>{store.zone_count === null ? '—' : formatNumber(store.zone_count, lang)}</dd></div>
    </dl>
    {store.zone_count !== 0 ? <div>
      <button type="button" className={styles.zoneToggle} aria-expanded={expanded} aria-controls={`zones-${store.id}`} onClick={() => setExpanded((value) => !value)}>{t('public.stores.showZones')}<Icon name="chevron-down" size={16} /></button>
      {expanded ? <div id={`zones-${store.id}`} className={styles.zoneList} aria-live="polite">
        {zones.isPending ? <p>{t('public.stores.loadingZones')}</p> : zones.isError ? <><p>{t('public.stores.zonesError')}</p><Button size="md" variant="ghost" onClick={() => { void zones.refetch(); }}>{t('public.retry')}</Button></> : zones.data.length ? <ul>{zones.data.map((zone) => <li key={zone.id}>{zone.name}</li>)}</ul> : <p>{t('public.stores.noZones')}</p>}
      </div> : null}
    </div> : null}
    <div className={styles.storeActions}>
      <CampaignLink storeId={store.id} fullWidth size="md" iconRight="arrow-right">{t('public.stores.choose')}</CampaignLink>
      {address ? <a className={styles.textLink} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([store.name, address].join(', '))}`} target="_blank" rel="noopener noreferrer">{t('public.stores.map')}<Icon name="arrow-up-right" size={16} /></a> : null}
    </div>
  </article>;
}
