import { useId } from 'react';
import { Badge, Chip, Icon, Meter } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { formatNumber, pluralKey } from '../../../../lib/format';
import { selectedStores } from '../summary';
import type { CatalogStore, CatalogZone, WizardCatalog } from '../types';
import type { CampaignWizardState } from '../useCampaignWizard';

function ZoneStore({ store, zones, wizard }: { store: CatalogStore; zones: CatalogZone[]; wizard: CampaignWizardState }) {
  const { t, lang } = useI18n();
  const nameId = useId();
  const chosen = zones.filter((zone) => wizard.form.zoneIds.includes(zone.id)).length;
  const invalid = Boolean(wizard.errors.zones) && chosen === 0;
  const count = (key: string, n: number) => t(pluralKey(key, n, lang), { count: formatNumber(n, lang) });
  return (
    <li className={invalid ? 'cmp-zone-store is-invalid' : 'cmp-zone-store'}>
      <div className="cmp-zone-store__head">
        <div className="cmp-zone-store__name">
          <strong id={nameId}>{store.name}</strong>
          <span>{[store.address, store.city].filter(Boolean).join(', ')}</span>
        </div>
        {chosen ? <Badge tone="brand">{count('campaigns.wizard.zones.selectedCount', chosen)}</Badge> : null}
        {!chosen && invalid ? <Badge tone="danger">{t('campaigns.wizard.zones.noneSelected')}</Badge> : null}
      </div>
      {zones.length ? (
        <div className="cmp-chips" role="group" aria-labelledby={nameId}>
          {zones.map((zone) => (
            <Chip
              key={zone.id}
              pressed={wizard.form.zoneIds.includes(zone.id)}
              label={zone.name}
              meta={zone.otherBrands === null ? undefined : zone.otherBrands ? count('campaigns.wizard.zones.otherBrands', zone.otherBrands) : t('campaigns.wizard.zones.onlyYou')}
              onClick={() => wizard.dispatch({ type: 'toggleZone', zoneId: zone.id })}
            />
          ))}
        </div>
      ) : (
        <p className="cab-muted">{t('campaigns.wizard.zones.noZones')}</p>
      )}
      {invalid && zones.length ? (
        <p className="ax-error">
          <Icon name="alert-circle" size={18} />
          <span>{t('campaigns.wizard.zones.storeError')}</span>
        </p>
      ) : null}
    </li>
  );
}

/** Step 4: shelf zones in every chosen store; quick chips apply a zone to all stores that have it. */
export function StepZones({ wizard, catalog }: { wizard: CampaignWizardState; catalog: WizardCatalog }) {
  const { t, lang } = useI18n();
  const quickId = useId();
  const { form, dispatch } = wizard;
  const stores = selectedStores(form, catalog);
  const zonesOf = (storeId: string) => catalog.zones.filter((zone) => zone.storeId === storeId);
  const offered = catalog.zones.filter((zone) => form.storeIds.includes(zone.storeId));
  const names = [...new Set(offered.map((zone) => zone.name))];
  const withZones = stores.filter((store) => zonesOf(store.id).some((zone) => form.zoneIds.includes(zone.id))).length;
  const pct = stores.length ? (withZones / stores.length) * 100 : 0;

  const toggleName = (name: string, pressed: boolean) => {
    const ids = offered.filter((zone) => zone.name === name).map((zone) => zone.id);
    dispatch({ type: 'zones', zoneIds: pressed ? form.zoneIds.filter((id) => !ids.includes(id)) : [...new Set([...form.zoneIds, ...ids])] });
  };
  const progress = t(pluralKey('campaigns.wizard.zones.progress', stores.length, lang), { done: formatNumber(withZones, lang), count: formatNumber(stores.length, lang) });

  return (
    <div className="cmp-fields">
      <section className="cmp-quick" aria-labelledby={quickId}>
        <div className="cmp-quick__head">
          <h3 className="cmp-quick__title" id={quickId}>
            <Icon name="layers" size={20} />
            {t('campaigns.wizard.zones.quickTitle')}
          </h3>
          <p className="cab-small">{t(pluralKey('campaigns.wizard.zones.quickText', stores.length, lang), { count: formatNumber(stores.length, lang) })}</p>
        </div>
        <div className="cmp-chips" role="group" aria-labelledby={quickId}>
          {names.map((name) => {
            const pressed = offered.filter((zone) => zone.name === name).every((zone) => form.zoneIds.includes(zone.id));
            return <Chip key={name} pressed={pressed} label={name} onClick={() => toggleName(name, pressed)} />;
          })}
        </div>
      </section>
      <div className="cmp-zones-progress">
        <span>{progress}</span>
        <Meter className="cmp-zones-progress__meter" value={pct} tone={pct === 100 ? 'success' : 'primary'} size="sm" label={progress} />
      </div>
      <ul className="cmp-zone-stores">
        {stores.map((store) => (
          <ZoneStore key={store.id} store={store} zones={zonesOf(store.id)} wizard={wizard} />
        ))}
      </ul>
    </div>
  );
}
