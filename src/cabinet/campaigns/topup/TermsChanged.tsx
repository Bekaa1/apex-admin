import { Checkbox, Icon } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { formatDayMonth, formatMoney } from '../../../lib/format';
import type { TopUpTerms } from './model';

interface TermsChangedProps {
  terms: TopUpTerms;
  tariffName: string;
  agreed: boolean;
  onAgree: (value: boolean) => void;
}

/** The plan's terms changed since the last invoice: what changed and the consent the new invoice needs. */
export function TermsChanged({ terms, tariffName, agreed, onAgree }: TermsChangedProps) {
  const { t, lang } = useI18n();
  const minimum = formatMoney(terms.minimum, lang);
  const previous = terms.previousMinimum !== null && terms.previousMinimum !== terms.minimum ? formatMoney(terms.previousMinimum, lang) : null;
  const vars = { tariff: tariffName, amount: minimum, was: previous ?? '', date: terms.changedAt ? formatDayMonth(terms.changedAt, lang) : '' };
  let text = t('campaigns.topUp.terms.textNow', vars);
  if (previous) text = t(terms.changedAt ? 'campaigns.topUp.terms.textWasSince' : 'campaigns.topUp.terms.textWas', vars);
  else if (terms.changedAt) text = t('campaigns.topUp.terms.textNowSince', vars);

  return (
    <div className="cmpt-change">
      <p className="cmpt-change__title">
        <Icon name="alert-triangle" size={20} />
        {t(previous ? 'campaigns.topUp.terms.minimumTitle' : 'campaigns.topUp.terms.title')}
      </p>
      <p className="cmpt-change__text">{text}</p>
      {previous ? (
        <div className="cmpt-price" aria-hidden="true">
          <div className="cmpt-price__item">
            <span>{t('campaigns.topUp.terms.was')}</span>
            <strong className="cmpt-price__was">{previous}</strong>
          </div>
          <Icon name="arrow-right" size={20} />
          <div className="cmpt-price__item">
            <span>{t('campaigns.topUp.terms.now')}</span>
            <strong>{minimum}</strong>
          </div>
        </div>
      ) : null}
      <p className="cmpt-change__text">{t('campaigns.topUp.terms.paidStays')}</p>
      <Checkbox checked={agreed} onChange={(event) => onAgree(event.target.checked)}>
        {t('campaigns.topUp.terms.agree')}
      </Checkbox>
    </div>
  );
}
