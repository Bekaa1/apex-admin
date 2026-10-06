import { useState } from 'react';
import { Button, Icon, SearchField, Select } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { formatNumber, pluralKey } from '../../../../lib/format';
import { summarize } from '../summary';
import type { WizardCatalog } from '../types';
import type { CampaignWizardState } from '../useCampaignWizard';
import { StoreRow } from './StoreRow';

const ALL = 'all';

function distinct(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
}

/** Step 3: stores, with search by name or address and filters by city and chain. */
export function StepStores({ wizard, catalog }: { wizard: CampaignWizardState; catalog: WizardCatalog }) {
  const { t, lang } = useI18n();
  const { form, errors, dispatch } = wizard;
  const [query, setQuery] = useState('');
  const [city, setCity] = useState(ALL);
  const [chain, setChain] = useState(ALL);

  const needle = query.trim().toLocaleLowerCase();
  const visible = catalog.stores.filter(
    (store) =>
      (city === ALL || store.city === city) &&
      (chain === ALL || store.name === chain) &&
      (!needle || `${store.name} ${store.address ?? ''}`.toLocaleLowerCase().includes(needle)),
  );
  const allVisibleChosen = visible.length > 0 && visible.every((store) => form.storeIds.includes(store.id));
  const visibleIds = new Set(visible.map((store) => store.id));
  const summary = summarize(form, catalog);

  const toggleVisible = () =>
    dispatch({
      type: 'stores',
      storeIds: allVisibleChosen ? form.storeIds.filter((id) => !visibleIds.has(id)) : [...new Set([...form.storeIds, ...visibleIds])],
    });

  return (
    <div className="cmp-fields">
      <div className="cmp-filters">
        <SearchField className="cmp-filters__search" size="md" label={t('campaigns.wizard.stores.search')} clearLabel={t('campaigns.list.clearSearch')} value={query} onValueChange={setQuery} />
        <Select
          size="md"
          icon="map-pin"
          hideLabel
          label={t('campaigns.wizard.stores.city')}
          options={[{ value: ALL, label: t('campaigns.wizard.stores.allCities') }, ...distinct(catalog.stores.map((s) => s.city)).map((c) => ({ value: c, label: c }))]}
          value={city}
          onValueChange={setCity}
        />
        <Select
          size="md"
          icon="store"
          hideLabel
          label={t('campaigns.wizard.stores.chain')}
          options={[{ value: ALL, label: t('campaigns.wizard.stores.allChains') }, ...distinct(catalog.stores.map((s) => s.name)).map((c) => ({ value: c, label: c }))]}
          value={chain}
          onValueChange={setChain}
        />
      </div>
      <div className="cmp-selbar" aria-live="polite">
        <p className="cmp-selbar__text">
          <strong>{t('campaigns.wizard.stores.selected', { count: formatNumber(summary.stores, lang), total: formatNumber(catalog.stores.length, lang) })}</strong>
          {summary.carts === null ? null : <span>{t(pluralKey('campaigns.row.carts', summary.carts, lang), { count: formatNumber(summary.carts, lang) })}</span>}
        </p>
        {visible.length ? (
          <Button variant="ghost" size="md" iconLeft={allVisibleChosen ? 'x' : 'check'} onClick={toggleVisible}>
            {allVisibleChosen ? t('campaigns.wizard.stores.unselectAll') : t('campaigns.wizard.stores.selectAll', { count: formatNumber(visible.length, lang) })}
          </Button>
        ) : null}
      </div>
      <div className={errors.stores ? 'cmp-stores is-invalid' : 'cmp-stores'}>
        <div className="cmp-stores__head" aria-hidden="true">
          <span />
          <span>{t('campaigns.wizard.stores.head.store')}</span>
          <span>{t('campaigns.wizard.stores.head.city')}</span>
          <span className="cmp-num">{t('campaigns.wizard.stores.head.carts')}</span>
          <span>{t('campaigns.wizard.stores.head.load')}</span>
        </div>
        {visible.length ? (
          <ul className="cmp-stores__list" aria-label={t('campaigns.wizard.stores.listLabel')}>
            {visible.map((store) => (
              <li key={store.id}>
                <StoreRow
                  store={store}
                  zones={catalog.zones.filter((zone) => zone.storeId === store.id).length}
                  checked={form.storeIds.includes(store.id)}
                  onToggle={() => dispatch({ type: 'toggleStore', storeId: store.id })}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="cmp-stores__empty">{t('campaigns.wizard.stores.empty')}</p>
        )}
      </div>
      {errors.stores ? (
        <p className="ax-error">
          <Icon name="alert-circle" size={18} />
          <span>{t('campaigns.wizard.stores.error')}</span>
        </p>
      ) : null}
    </div>
  );
}
