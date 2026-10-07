import { useId, useState } from 'react';
import { Alert, Button, TextAreaField, TextField, Timeline } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { useAccount } from '../../useAccount';

const HOW = ['task', 'offer', 'contract', 'launch'];

/** «Как начать» and the request form. Requests are sent once the backend adds `corporate_requests`; until then the button stays off. */
export function CorporateRequest() {
  const { t } = useI18n();
  const howId = useId();
  const formId = useId();
  const account = useAccount();
  // The company comes from the profile until the user types their own.
  const [company, setCompany] = useState<string | null>(null);
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  return (
    <div className="cab-split cmp-corp-split">
      <section className="cab-card cmp-corp-how" aria-labelledby={howId}>
        <h2 className="cab-h3" id={howId}>
          {t('campaigns.corporate.howTitle')}
        </h2>
        <Timeline
          stateLabels={{ done: t('campaigns.row.stepState.done'), current: t('campaigns.row.stepState.current'), todo: t('campaigns.row.stepState.todo') }}
          items={HOW.map((step) => ({
            key: step,
            title: t(`campaigns.corporate.how.${step}.title`),
            text: t(`campaigns.corporate.how.${step}.text`),
            state: 'todo',
          }))}
        />
      </section>
      <section className="cab-card cmp-corp-form" aria-labelledby={formId} id="request">
        <h2 className="cab-h3" id={formId}>
          {t('campaigns.corporate.form.title')}
        </h2>
        <form className="cmp-fields" noValidate onSubmit={(event) => event.preventDefault()}>
          <p className="cab-small">{t('campaigns.corporate.form.text')}</p>
          <TextField
            label={t('campaigns.corporate.form.company')}
            autoComplete="organization"
            value={company ?? account.companyName ?? ''}
            onChange={(event) => setCompany(event.target.value)}
          />
          <TextField label={t('campaigns.corporate.form.contact')} autoComplete="name" value={contact} onChange={(event) => setContact(event.target.value)} />
          <TextField
            label={t('campaigns.corporate.form.phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+7 7__ ___ __ __"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <TextAreaField
            label={t('campaigns.corporate.form.message')}
            optional={t('campaigns.corporate.form.optional')}
            placeholder={t('campaigns.corporate.form.messagePlaceholder')}
            rows={3}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <Alert tone="info" title={t('campaigns.corporate.form.soon.title')}>
            {t('campaigns.corporate.form.soon.text')}
          </Alert>
          <Button type="submit" variant="primary" size="lg" fullWidth iconLeft="send" disabled>
            {t('campaigns.corporate.form.submit')}
          </Button>
        </form>
      </section>
    </div>
  );
}
