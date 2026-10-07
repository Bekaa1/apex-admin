import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Icon, SearchField, Select, Skeleton } from '../design-system';
import { useAuthSession } from '../auth/useAuthSession';
import { useI18n } from '../i18n/i18n';
import { formatNumber } from '../lib/format';
import { SUPPORT_WHATSAPP_URL } from '../lib/contacts';
import { PageHeading, StartBanner } from './PageParts';
import { fetchPublicStores } from './stores/api';
import { StoreCard } from './stores/StoreCard';
import styles from './PublicPages.module.css';

export function StoresPage() {
  const { t, lang } = useI18n();
  const { session, status } = useAuthSession();
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const normalizedSearch = useDeferredValue(search.trim().toLocaleLowerCase(lang));
  const catalog = useQuery({ queryKey: ['public-store-catalog', session?.user.id ?? 'guest'], queryFn: ({ signal }) => fetchPublicStores(signal), enabled: status !== 'loading', staleTime: 300_000, retry: 1 });
  const stores = catalog.data ?? [];
  const cities = [...new Set(stores.map((store) => store.city?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, lang));
  const filtered = stores.filter((store) => (!city || store.city?.trim() === city) && [store.name, store.address, store.city].filter(Boolean).join(' ').toLocaleLowerCase(lang).includes(normalizedSearch));
  const reset = () => { setSearch(''); setCity(''); };

  return <div className={styles.page}>
    <PageHeading page="stores" />
    <div className={styles.toolbar}>
      <SearchField label={t('public.stores.search')} clearLabel={t('public.stores.clear')} value={search} onValueChange={setSearch} />
      <Select hideLabel label={t('public.stores.city')} icon="map-pin" value={city} onValueChange={setCity} options={[{ value: '', label: t('public.stores.allCities') }, ...cities.map((value) => ({ value, label: value }))]} />
    </div>
    {catalog.isPending ? <div className={styles.storeGrid} role="status" aria-label={t('public.stores.loading')} aria-busy="true">{[1, 2, 3].map((key) => <Skeleton key={key} variant="block" height={340} />)}</div>
      : catalog.isError ? <Alert tone="danger" title={t('public.stores.errorTitle')} action={<Button variant="secondary" size="md" loading={catalog.isFetching} onClick={() => { void catalog.refetch(); }}>{t('public.retry')}</Button>}>{t('public.stores.errorText')}</Alert>
      : !stores.length ? <section className={styles.empty}><span className={styles.iconTile}><Icon name="store" size={30} /></span><h2>{t('public.stores.emptyTitle')}</h2><p>{t(session ? 'public.stores.emptyText' : 'public.stores.guestEmptyText')}</p><div className={styles.inlineActions}>{!session ? <Button href="/login" variant="secondary">{t('landing.nav.login')}</Button> : null}<Button href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" iconLeft="message-circle">{t('public.stores.ask')}</Button></div></section>
      : <>
        <div className={styles.results}><p role="status">{t('public.stores.found', { count: formatNumber(filtered.length, lang) })}</p>{search || city ? <Button size="md" variant="ghost" onClick={reset}>{t('public.stores.reset')}</Button> : null}</div>
        {filtered.length ? <div className={styles.storeGrid}>{filtered.map((store) => <StoreCard key={store.id} store={store} />)}</div> : <section className={styles.empty}><Icon name="search" size={32} /><h2>{t('public.stores.notFound')}</h2><p>{t('public.stores.trySearch')}</p><Button variant="secondary" onClick={reset}>{t('public.stores.reset')}</Button></section>}
      </>}
    <StartBanner />
  </div>;
}
