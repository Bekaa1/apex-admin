import { useId, useState } from 'react';
import { Alert, Button, TextAreaField, TextField, Timeline } from '../../../design-system';
import { useI18n } from '../../../i18n/i18n';
import { useAccount } from '../../useAccount';
import { useCorporateRequest } from './useCorporateRequest';

const HOW = ['task', 'offer', 'contract', 'launch'];
// The backend accepts the same phone characters and message length.
const PHONE = /^[+0-9 ()-]{5,30}$/;
const MESSAGE_MAX = 2000;

/** «Как начать» and the request form; after sending, the form gives way to the confirmation. */
export function CorporateRequest() {
  const { t } = useI18n();
  const howId = useId();
  const formId = useId();
  const account = useAccount();
  const request = useCorporateRequest();
  // The company comes from the profile until the user types their own.
  const [company, setCompany] = useState<string | null>(null);
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [attempted, setAttempted] = useState(false);

  const companyValue = company ?? account.companyName ?? '';
  const companyMissing = !companyValue.trim();
  const phoneInvalid = !PHONE.test(phone.trim());
  const { errorCode } = request;
  const companyError = (attempted && companyMissing) || errorCode === 'invalid_company' ? t('campaigns.corporate.form.errors.company') : undefined;
  const phoneError = (attempted && phoneInvalid) || errorCode === 'invalid_phone' ? t('campaigns.corporate.form.errors.phone') : undefined;
  const formError = errorCode && !['invalid_company', 'invalid_phone'].includes(errorCode) ? errorCode : null;
  const email = account.contact?.includes('@') ? account.contact : null;

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
        {request.sent ? (
          <Alert tone="success" title={t('campaigns.corporate.form.sent.title')}>
            {t('campaigns.corporate.form.sent.text')}
            {email ? ` ${t('campaigns.corporate.form.sent.copy', { email })}` : null}
          </Alert>
        ) : (
          <form
            className="cmp-fields"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              setAttempted(true);
              if (companyMissing || phoneInvalid) return;
              request.send({ company: companyValue.trim(), contactName: contact.trim(), phone: phone.trim(), message: message.trim() });
            }}
          >
            <p className="cab-small">{t('campaigns.corporate.form.text')}</p>
            <TextField
              label={t('campaigns.corporate.form.company')}
              autoComplete="organization"
              value={companyValue}
              error={companyError}
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
              error={phoneError}
              onChange={(event) => setPhone(event.target.value)}
            />
            <TextAreaField
              label={t('campaigns.corporate.form.message')}
              optional={t('campaigns.corporate.form.optional')}
              placeholder={t('campaigns.corporate.form.messagePlaceholder')}
              rows={3}
              maxLength={MESSAGE_MAX}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            {formError ? (
              <Alert tone="danger" title={t('campaigns.corporate.form.failed.title')}>
                {t(formError === 'too_many_requests' ? 'campaigns.corporate.form.errors.tooMany' : 'campaigns.corporate.form.failed.text')}
              </Alert>
            ) : null}
            <Button type="submit" variant="primary" size="lg" fullWidth iconLeft="send" loading={request.sending}>
              {t('campaigns.corporate.form.submit')}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
