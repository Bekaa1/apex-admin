import '../campaigns.css';
import { useId, type ReactNode } from 'react';
import { Navigate, useLocation, useParams } from 'react-router';
import { Icon, Timeline, type TimelineItem } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatMoney, formatPrice } from '../../../lib/format';
import { CABINET_LINKS } from '../../sections';
import { TARIFFS } from '../../tariffs';
import { ButtonLink } from '../../ui/ButtonLink';
import { useAccount } from '../../useAccount';
import type { ChangeField, SentReceipt } from './types';

const CHANGE_FIELDS: ChangeField[] = ['name', 'description', 'video', 'cover', 'stores', 'zones'];

function readReceipt(state: unknown): SentReceipt | null {
  if (typeof state !== 'object' || state === null) return null;
  const name: unknown = Reflect.get(state, 'name');
  if (typeof name !== 'string') return null;
  if (Reflect.get(state, 'kind') === 'edit') {
    const changed: unknown = Reflect.get(state, 'changed');
    const fields = Array.isArray(changed) ? CHANGE_FIELDS.filter((field) => changed.includes(field)) : [];
    return { kind: 'edit', name, changed: fields, paused: Reflect.get(state, 'paused') === true };
  }
  const budget: unknown = Reflect.get(state, 'budget');
  const price: unknown = Reflect.get(state, 'pricePerPlay');
  const tariff = TARIFFS.find((plan) => plan.code === Reflect.get(state, 'tariff'))?.code;
  return typeof budget === 'number' && tariff ? { kind: 'new', name, budget, tariff, pricePerPlay: typeof price === 'number' ? price : null } : null;
}

interface DoneProps {
  title: string;
  lead: string;
  rows: Array<[string, ReactNode]>;
  steps: TimelineItem[];
  ctas: ReactNode;
}

function Done({ title, lead, rows, steps, ctas }: DoneProps) {
  const { t } = useI18n();
  const titleId = useId();
  return (
    <div className="cmp-done">
      <section className="cab-card cmp-done__card" aria-labelledby={titleId}>
        <span className="cmp-done__icon" aria-hidden="true">
          <Icon name="check" size={30} strokeWidth={2.25} />
        </span>
        <h2 className="cab-h2" id={titleId}>
          {title}
        </h2>
        <p className="cab-lead cmp-done__lead">{lead}</p>
        <dl className="cab-receipt cmp-done__receipt">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <Timeline
          className="cmp-done__timeline"
          stateLabels={{ done: t('campaigns.row.stepState.done'), current: t('campaigns.row.stepState.current'), todo: t('campaigns.row.stepState.todo') }}
          items={steps}
        />
        <div className="cmp-done__ctas">{ctas}</div>
      </section>
    </div>
  );
}

/** «Отправлено на проверку» after a new campaign or an edit. Opened right after sending; without that state it returns to the list. */
export function CampaignSentPage() {
  const { t, lang } = useI18n();
  const { campaignId } = useParams();
  const location = useLocation();
  const { contact } = useAccount();
  const receipt = readReceipt(location.state);
  if (!receipt || !campaignId) return <Navigate to={CABINET_LINKS.campaigns} replace />;
  const email = contact ?? '';

  if (receipt.kind === 'edit') {
    const fields = receipt.changed.map((field) => t(`campaigns.edit.changed.${field}`)).join(', ');
    const rows: Array<[string, ReactNode]> = [[t('campaigns.sent.name'), receipt.name]];
    rows.push([t('campaigns.edit.sent.changed'), fields ? fields.charAt(0).toLocaleUpperCase() + fields.slice(1) : t('campaigns.edit.sent.unchanged')]);
    if (receipt.paused) rows.push([t('campaigns.edit.sent.plays'), t('campaigns.edit.sent.paused')]);
    return (
      <Done
        title={t(fields ? 'campaigns.edit.sent.title' : 'campaigns.edit.sent.titleResent')}
        lead={t(fields ? (receipt.paused ? 'campaigns.edit.sent.leadPaused' : 'campaigns.edit.sent.lead') : 'campaigns.edit.sent.leadResent', { name: receipt.name, email })}
        rows={rows}
        steps={[
          { key: 'review', title: t('campaigns.row.timeline.changesReview'), text: t('campaigns.edit.after.reviewText'), state: 'current' },
          receipt.paused
            ? { key: 'resume', title: t('campaigns.row.timeline.resume'), text: t('campaigns.edit.after.resumeText'), state: 'todo' }
            : { key: 'launch', title: t('campaigns.row.timeline.launch'), text: t('campaigns.sent.timeline.launchText'), state: 'todo' },
        ]}
        ctas={
          <>
            <ButtonLink to={CABINET_LINKS.campaign(campaignId)} variant="primary" size="lg">
              {t('campaigns.topUp.back')}
            </ButtonLink>
            <ButtonLink to={CABINET_LINKS.campaigns} variant="ghost" size="lg">
              {t('campaigns.sent.toList')}
            </ButtonLink>
          </>
        }
      />
    );
  }

  const amount = formatMoney(receipt.budget, lang);
  const rows: Array<[string, ReactNode]> = [
    [t('campaigns.sent.name'), receipt.name],
    [t('campaigns.sent.tariff'), t(`cabinet.tariffs.${receipt.tariff}.name`)],
  ];
  if (receipt.pricePerPlay !== null) rows.push([t('cabinet.tariffs.pricePerPlay'), formatPrice(receipt.pricePerPlay, lang)]);
  rows.push([t('campaigns.sent.toPay'), amount]);
  return (
    <Done
      title={t('campaigns.sent.title')}
      lead={t('campaigns.sent.lead', { name: receipt.name, email })}
      rows={rows}
      steps={[
        { key: 'review', title: t('campaigns.row.timeline.review'), text: t('campaigns.sent.timeline.reviewText'), state: 'current' },
        { key: 'payment', title: t('campaigns.row.timeline.payment'), text: t('campaigns.sent.timeline.paymentText', { amount, email }), state: 'todo' },
        { key: 'launch', title: t('campaigns.row.timeline.launch'), text: t('campaigns.sent.timeline.launchText'), state: 'todo' },
      ]}
      ctas={
        <>
          <ButtonLink to={CABINET_LINKS.campaigns} variant="primary" size="lg">
            {t('campaigns.sent.toList')}
          </ButtonLink>
          <ButtonLink to={CABINET_LINKS.newCampaign} variant="ghost" size="lg" iconLeft="plus">
            {t('campaigns.sent.createAnother')}
          </ButtonLink>
        </>
      }
    />
  );
}
