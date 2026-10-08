import type { ReactNode } from 'react';
import { Button } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { formatMoney, formatNumber, formatPrice, pluralKey } from '../../../../lib/format';
import { termsOf } from '../../../tariffs';
import { CampaignCover } from '../../../ui/CampaignCover';
import { formatClock } from '../media';
import { selectedStores, selectedZones, summarize } from '../summary';
import type { StepId, WizardCatalog } from '../types';
import type { CampaignWizardState } from '../useCampaignWizard';

const SHOWN_STORES = 3;

function Item({ label, step, onEdit, children }: { label: string; step: StepId; onEdit: (step: StepId) => void; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="cmp-review__item">
      <div className="cmp-review__head">
        <span className="cmp-review__label">{label}</span>
        <Button className="cmp-review__edit" variant="ghost" size="md" iconLeft="pencil" onClick={() => onEdit(step)} aria-label={`${t('campaigns.wizard.budget.edit')}: ${label}`}>
          {t('campaigns.wizard.budget.edit')}
        </Button>
      </div>
      {children}
    </div>
  );
}

/** «Проверьте кампанию»: everything chosen on the earlier steps, each with «Изменить». */
export function ReviewList({ wizard, catalog }: { wizard: CampaignWizardState; catalog: WizardCatalog }) {
  const { t, lang } = useI18n();
  const { form, goTo } = wizard;
  const summary = summarize(form, wizard.ctx);
  const tariff = termsOf(catalog.tariffs, form.tariff);
  const count = (key: string, n: number) => t(pluralKey(key, n, lang), { count: formatNumber(n, lang) });
  const video = form.video.status === 'ready' ? form.video : null;
  const cover = form.cover.status === 'ready' ? form.cover : null;
  const seconds = video?.meta?.durationSec;

  const stores = selectedStores(form, catalog).map((store) => [store.name, store.address].filter(Boolean).join(', '));
  const shown = stores.slice(0, SHOWN_STORES).join('; ');
  const storeList = stores.length > SHOWN_STORES ? t('campaigns.wizard.budget.andMore', { list: shown, count: formatNumber(stores.length - SHOWN_STORES, lang) }) : shown;
  const zoneNames = [...new Set(selectedZones(form, catalog).map((zone) => zone.name))].join(', ');

  return (
    <div className="cmp-review">
      <Item label={t('campaigns.steps.media')} step="media" onEdit={goTo}>
        <div className="cmp-review__media">
          <CampaignCover url={cover?.url ?? null} videoUrl={video?.url} tone={1} size="lg">
            {seconds ? <span className="cmp-cover__time">{formatClock(seconds)}</span> : null}
          </CampaignCover>
          <div className="cmp-review__text">
            <strong>{form.name.trim()}</strong>
            {form.description.trim() ? <p>{form.description.trim()}</p> : null}
            <span className="cmp-review__meta">
              {[video?.fileName, seconds ? t('campaigns.wizard.seconds', { n: formatNumber(seconds, lang) }) : null, t(cover ? 'campaigns.wizard.budget.withCover' : 'campaigns.wizard.budget.withoutCover')]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </div>
        </div>
      </Item>
      <Item label={t('campaigns.steps.tariff')} step="tariff" onEdit={goTo}>
        {tariff ? (
          <p className="cmp-review__value">
            <strong>{t(`cabinet.tariffs.${tariff.code}.name`)}</strong>
            <span>{t('campaigns.wizard.budget.from', { amount: formatMoney(tariff.minimum, lang) })}</span>
            <span>{t('cabinet.tariffs.perPlay', { amount: formatPrice(tariff.pricePerPlay, lang) })}</span>
          </p>
        ) : null}
      </Item>
      <Item label={t('campaigns.steps.stores')} step="stores" onEdit={goTo}>
        <p className="cmp-review__value">
          <strong>{count('campaigns.row.stores', summary.stores)}</strong>
          {summary.carts === null ? null : <span>{count('campaigns.row.carts', summary.carts)}</span>}
        </p>
        <p className="cmp-review__list">{storeList}</p>
      </Item>
      {summary.zones ? (
        <Item label={t('campaigns.steps.zones')} step="zones" onEdit={goTo}>
          <p className="cmp-review__value">
            <strong>{count('campaigns.wizard.zones.selectedCount', summary.zones.count)}</strong>
            <span>{t('campaigns.wizard.summary.zonesIn', { count: formatNumber(summary.zones.storesWithZones, lang), total: formatNumber(summary.stores, lang) })}</span>
          </p>
          <p className="cmp-review__list">{zoneNames}</p>
        </Item>
      ) : null}
    </div>
  );
}
