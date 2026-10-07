import { Checkbox, Icon } from '../../design-system';
import { useI18n } from '../../i18n/i18n';

export interface TermsDiff {
  key: string;
  label: string;
  /** null when the earlier value isn't known: only the current one is shown. */
  was: string | null;
  now: string;
}

interface TermsChangedProps {
  text: string;
  diffs: TermsDiff[];
  /** What the change means for money already paid or about to be invoiced. */
  note: string;
  agreed: boolean;
  /** A submit was tried without consent. */
  invalid?: boolean;
  onAgree: (value: boolean) => void;
}

/** The plan's terms changed since the advertiser saw them: «было → стало» and the consent the next invoice needs. */
export function TermsChanged({ text, diffs, note, agreed, invalid = false, onAgree }: TermsChangedProps) {
  const { t } = useI18n();
  return (
    <div className={invalid ? 'cmpt-change is-invalid' : 'cmpt-change'}>
      <p className="cmpt-change__title">
        <Icon name="alert-triangle" size={20} />
        {t('campaigns.terms.title')}
      </p>
      <p className="cmpt-change__text">{text}</p>
      {diffs.map((diff) =>
        diff.was === null ? (
          <p key={diff.key} className="cmpt-change__text">
            {diff.label}: <strong>{diff.now}</strong>
          </p>
        ) : (
          <div key={diff.key} className="cmpt-price">
            <div className="cmpt-price__item">
              <span>{t('campaigns.terms.was', { label: diff.label })}</span>
              <strong className="cmpt-price__was">{diff.was}</strong>
            </div>
            <Icon name="arrow-right" size={20} />
            <div className="cmpt-price__item">
              <span>{t('campaigns.terms.now')}</span>
              <strong>{diff.now}</strong>
            </div>
          </div>
        ),
      )}
      <p className="cmpt-change__text">{note}</p>
      <Checkbox checked={agreed} error={invalid ? t('campaigns.terms.error') : undefined} onChange={(event) => onAgree(event.target.checked)}>
        {t('campaigns.terms.agree')}
      </Checkbox>
    </div>
  );
}
