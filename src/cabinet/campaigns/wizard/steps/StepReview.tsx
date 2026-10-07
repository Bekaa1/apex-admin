import { useId } from 'react';
import { Button, Checkbox, Icon, Timeline } from '../../../../design-system';
import { useI18n } from '../../../../i18n/i18n';
import { formatMoney, formatNumber, pluralKey } from '../../../../lib/format';
import { CABINET_LINKS } from '../../../sections';
import { ButtonLink } from '../../../ui/ButtonLink';
import { campaignChanges, type CampaignChange, type MediaRef, type ZoneCount } from '../changes';
import type { CatalogStore, EditedCampaign, StepId, WizardCatalog } from '../types';
import type { CampaignWizardState } from '../useCampaignWizard';

const FIELD_STEP: Record<CampaignChange['field'], StepId> = { name: 'media', description: 'media', video: 'media', cover: 'media', stores: 'stores', zones: 'zones' };

function ChangeItem({ change, onEdit }: { change: CampaignChange; onEdit: (step: StepId) => void }) {
  const { t, lang } = useI18n();
  const count = (key: string, n: number) => t(pluralKey(key, n, lang), { count: formatNumber(n, lang) });
  const label = t(`campaigns.edit.fields.${change.field}`);
  const media = (ref: MediaRef | null) =>
    ref ? [ref.fileName, ref.durationSec ? t('campaigns.wizard.seconds', { n: Math.round(ref.durationSec) }) : null].filter(Boolean).join(' · ') : t('campaigns.edit.values.noVideo');
  const zones = (value: ZoneCount) =>
    `${count('campaigns.wizard.zones.selectedCount', value.count)} · ${t('campaigns.wizard.summary.zonesIn', { count: formatNumber(value.storesWithZones, lang), total: formatNumber(value.stores, lang) })}`;
  const stores = (list: CatalogStore[]) => list.map((store) => [store.name, store.address].filter(Boolean).join(', ')).join('; ');

  let was = '';
  let now = '';
  switch (change.field) {
    case 'name':
      [was, now] = [change.was, change.now];
      break;
    case 'description':
      [was, now] = [change.was || t('campaigns.edit.values.noDescription'), change.now || t('campaigns.edit.values.noDescription')];
      break;
    case 'video':
      [was, now] = [media(change.was), media(change.now)];
      break;
    case 'cover':
      [was, now] = [change.was ?? t('campaigns.edit.values.firstFrame'), change.now ?? t('campaigns.edit.values.firstFrame')];
      break;
    case 'stores':
      [was, now] = [count('campaigns.row.stores', change.was), count('campaigns.row.stores', change.now)];
      break;
    case 'zones':
      [was, now] = [zones(change.was), zones(change.now)];
      break;
  }

  return (
    <li className="cmp-change">
      <div className="cmp-change__head">
        <span className="cmp-review__label">{label}</span>
        <Button className="cmp-review__edit" variant="ghost" size="md" iconLeft="pencil" onClick={() => onEdit(FIELD_STEP[change.field])} aria-label={`${t('campaigns.wizard.budget.edit')}: ${label}`}>
          {t('campaigns.wizard.budget.edit')}
        </Button>
      </div>
      <div className="cmp-change__diff">
        <div className="cmp-change__was">
          <span className="cmp-change__tag">{t('campaigns.topUp.terms.was')}</span>
          <span>{was}</span>
        </div>
        <Icon name="arrow-right" size={18} className="cmp-change__arrow" />
        <div className="cmp-change__now">
          <span className="cmp-change__tag">{t('campaigns.topUp.terms.now')}</span>
          <span>{now}</span>
        </div>
      </div>
      {change.field === 'stores' && change.added.length ? (
        <p className="cmp-change__list">
          <Icon name="plus" size={16} />
          <span>
            <span className="cmp-change__list-label">{t('campaigns.edit.added')}</span> {stores(change.added)}
          </span>
        </p>
      ) : null}
      {change.field === 'stores' && change.removed.length ? (
        <p className="cmp-change__list">
          <Icon name="minus" size={16} />
          <span>
            <span className="cmp-change__list-label">{t('campaigns.edit.removed')}</span> {stores(change.removed)}
          </span>
        </p>
      ) : null}
    </li>
  );
}

/** The last step of an edit: what changed, the budget (read-only), what happens next and the rules consent. */
export function StepReview({ wizard, catalog, campaign }: { wizard: CampaignWizardState; catalog: WizardCatalog; campaign: EditedCampaign }) {
  const { t, lang } = useI18n();
  const changesId = useId();
  const budgetId = useId();
  const afterId = useId();
  const { form, original, errors, dispatch, goTo } = wizard;
  const changes = original ? campaignChanges(original, form, catalog) : [];
  const resumes = campaign.running || campaign.launched;

  return (
    <div className="cmp-fields cmp-fields--loose">
      <section className="cmp-sub" aria-labelledby={changesId}>
        <h3 className="cmp-sub__title" id={changesId}>
          {t('campaigns.edit.changesTitle')}
        </h3>
        {changes.length ? (
          <ul className="cmp-changes">
            {changes.map((change) => (
              <ChangeItem key={change.field} change={change} onEdit={goTo} />
            ))}
          </ul>
        ) : (
          <div className={errors.changes ? 'cmp-nochanges is-invalid' : 'cmp-nochanges'}>
            <Icon name="info" size={20} />
            <div>
              <p className="cmp-nochanges__title">{t('campaigns.edit.noChanges.title')}</p>
              <p className="cab-small">{t('campaigns.edit.noChanges.text')}</p>
              {errors.changes ? (
                <p className="ax-error" role="alert">
                  <Icon name="alert-circle" size={18} />
                  <span>{t('campaigns.edit.noChanges.error')}</span>
                </p>
              ) : null}
            </div>
          </div>
        )}
      </section>
      <section className="cmp-sub" aria-labelledby={budgetId}>
        <h3 className="cmp-sub__title" id={budgetId}>
          {t('campaigns.details.budget.title')}
        </h3>
        <div className="cmp-ro-budget">
          <div className="cmp-ro-budget__value">
            <strong>{formatMoney(campaign.budget, lang)}</strong>
            {campaign.launched ? <span>{t('campaigns.edit.summary.left', { amount: formatMoney(campaign.left, lang) })}</span> : null}
          </div>
          {campaign.canTopUp ? (
            <ButtonLink to={CABINET_LINKS.campaignTopUp(campaign.id)} variant="secondary" size="md" iconLeft="wallet">
              {t('campaigns.row.actions.topUp')}
            </ButtonLink>
          ) : null}
        </div>
        <p className="cab-note">
          <Icon name="info" size={18} />
          {t(campaign.canTopUp ? 'campaigns.edit.budgetNoteTopUp' : 'campaigns.edit.budgetNote')}
        </p>
      </section>
      <section className="cmp-sub" aria-labelledby={afterId}>
        <h3 className="cmp-sub__title" id={afterId}>
          {t('campaigns.edit.afterTitle')}
        </h3>
        <Timeline
          stateLabels={{ done: t('campaigns.row.stepState.done'), current: t('campaigns.row.stepState.current'), todo: t('campaigns.row.stepState.todo') }}
          items={[
            { key: 'review', title: t('campaigns.row.timeline.changesReview'), text: t('campaigns.edit.after.reviewText'), state: 'todo' },
            resumes
              ? { key: 'resume', title: t('campaigns.row.timeline.resume'), text: t('campaigns.edit.after.resumeText'), state: 'todo' }
              : { key: 'launch', title: t('campaigns.row.timeline.launch'), text: t('campaigns.sent.timeline.launchText'), state: 'todo' },
          ]}
        />
      </section>
      <Checkbox
        checked={form.rulesAccepted}
        error={errors.rules ? t('campaigns.wizard.budget.rulesError') : undefined}
        onChange={(event) => dispatch({ type: 'rules', value: event.target.checked })}
      >
        {t('campaigns.wizard.budget.rules')}
      </Checkbox>
    </div>
  );
}
