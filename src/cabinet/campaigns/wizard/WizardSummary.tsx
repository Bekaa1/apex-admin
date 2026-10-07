import { useId, type ReactNode } from 'react';
import { Icon } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatMoney, formatNumber, pluralKey } from '../../../lib/format';
import { summarize } from './summary';
import type { CampaignForm, MediaState, StepId, WizardCatalog } from './types';

function Stack({ main, sub }: { main: ReactNode; sub?: ReactNode }) {
  return (
    <span className="cmp-summary__stack">
      {main}
      {sub ? <span className="cmp-summary__sub">{sub}</span> : null}
    </span>
  );
}

const Empty = ({ children = '—' }: { children?: ReactNode }) => <span className="cab-subtle">{children}</span>;

function MediaValue({ media, optional }: { media: MediaState; optional?: string }) {
  const { t } = useI18n();
  if (media.status !== 'ready') return <Empty>{optional}</Empty>;
  const seconds = media.meta?.durationSec;
  return (
    <span className="cmp-ok">
      <Icon name="check-circle" size={16} />
      {seconds ? t('campaigns.wizard.seconds', { n: Math.round(seconds) }) : media.fileName}
    </span>
  );
}

/** «Ваша кампания»: what is chosen so far and the budget. */
export function WizardSummary({ step, form, catalog }: { step: StepId; form: CampaignForm; catalog: WizardCatalog }) {
  const { t, lang } = useI18n();
  const titleId = useId();
  const summary = summarize(form, catalog);
  const count = (key: string, n: number) => t(pluralKey(key, n, lang), { count: formatNumber(n, lang) });
  const onBudget = step === 'budget';

  let zones: ReactNode = <Empty />;
  if (!summary.zones) zones = <Empty>{t('campaigns.wizard.summary.zonesNotNeeded')}</Empty>;
  else if (summary.zones.count) {
    zones = (
      <Stack
        main={count('campaigns.wizard.zones.selectedCount', summary.zones.count)}
        sub={t('campaigns.wizard.summary.zonesIn', { count: formatNumber(summary.zones.storesWithZones, lang), total: formatNumber(summary.stores, lang) })}
      />
    );
  }

  const total = onBudget ? form.budget : summary.minimum;
  const totalSub = onBudget
    ? summary.minimum !== null && t('campaigns.wizard.summary.minimumOf', { amount: formatMoney(summary.minimum, lang) })
    : summary.minimum === null && t('campaigns.wizard.summary.dependsOnTariff');

  return (
    <section className="cab-card cmp-summary" aria-labelledby={titleId}>
      <h3 className="cmp-aside-card__title" id={titleId}>
        {t('campaigns.wizard.summary.title')}
      </h3>
      <dl className="cab-receipt cmp-summary__list">
        <div>
          <dt>{t('campaigns.wizard.summary.name')}</dt>
          <dd>{form.name.trim() || <Empty />}</dd>
        </div>
        <div>
          <dt>{t('campaigns.wizard.summary.video')}</dt>
          <dd>
            <MediaValue media={form.video} />
          </dd>
        </div>
        <div>
          <dt>{t('campaigns.wizard.summary.cover')}</dt>
          <dd>
            <MediaValue media={form.cover} optional={t('campaigns.wizard.summary.optional')} />
          </dd>
        </div>
        <div>
          <dt>{t('campaigns.wizard.summary.tariff')}</dt>
          <dd>{form.tariff ? t(`cabinet.tariffs.${form.tariff}.name`) : <Empty />}</dd>
        </div>
        <div>
          <dt>{t('campaigns.wizard.summary.stores')}</dt>
          <dd>
            {summary.stores ? (
              <Stack main={count('campaigns.row.stores', summary.stores)} sub={summary.carts === null ? undefined : count('campaigns.row.carts', summary.carts)} />
            ) : (
              <Empty />
            )}
          </dd>
        </div>
        <div>
          <dt>{t('campaigns.wizard.summary.zones')}</dt>
          <dd>{zones}</dd>
        </div>
      </dl>
      <div className="cmp-summary__total">
        <span>{t(onBudget ? 'campaigns.wizard.summary.yourBudget' : 'campaigns.wizard.summary.minimum')}</span>
        <strong>{total === null ? '—' : formatMoney(total, lang)}</strong>
        {totalSub ? <span className="cmp-summary__sub">{totalSub}</span> : null}
      </div>
    </section>
  );
}
