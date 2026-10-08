import { useState, type FormEvent } from 'react';
import { Alert, Button, PasswordField, TextField } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { AuthHead, AuthLayout, AuthNote } from './AuthLayout';
import { useAuthLinks } from './links';
import { useContactInput } from './useContactInput';
import { CONTACT_ERROR_KEY, EMAIL_ERROR_KEY, PASSWORD_ERROR_KEY, validateEmail, validateNewPassword, validateSignupContact } from './validation';

/** Reset step 1: request a password recovery code without confirming whether the contact exists. */
export type ResetPasswordStartError = 'rateLimit' | 'unavailable';

export function ResetPasswordEmailScreen({ admin = false, loading, error, defaultContact = '', onSubmit }: { admin?: boolean; loading?: boolean; error?: ResetPasswordStartError | null; defaultContact?: string; onSubmit?: (contact: string) => void }) {
  const { t } = useI18n();
  const links = useAuthLinks();
  const input = useContactInput(defaultContact);
  const [email, setEmail] = useState(defaultContact);
  const contact = admin ? email : input.contact;
  const validate = admin ? validateEmail : validateSignupContact;
  const [submitted, setSubmitted] = useState(false);
  const problem = submitted ? validate(contact) : null;
  const isPhoneInput = /^[+\d]/.test(contact.trim());
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!loading && !validate(contact)) onSubmit?.(contact.trim());
  };
  return (
    <AuthLayout admin={admin} back={{ href: links.login, label: t('common.backToLogin') }}>
      <form className="auth__form" noValidate onSubmit={submit}>
        <AuthHead badge={t('common.step', { n: 1 })} title={t('reset.email.title')} subtitle={t(admin ? 'adminAuth.resetSubtitle' : 'reset.email.subtitle')} />
        {error === 'rateLimit' ? (
          <Alert tone="warning" title={t('reset.errors.rateLimitTitle')}>{t('reset.errors.rateLimitBody')}</Alert>
        ) : error === 'unavailable' ? (
          <Alert tone="danger" title={t('reset.errors.unavailableTitle')}>{t('reset.errors.unavailableBody')}</Alert>
        ) : null}
        <TextField
          label={t(admin ? 'adminAuth.email' : 'signup.contactLabel')}
          type={admin ? 'email' : 'text'}
          inputMode={!admin && isPhoneInput ? 'tel' : 'email'}
          autoComplete="username"
          placeholder={admin ? 'name@company.kz' : t('common.contactPlaceholder')}
          value={contact}
          maxLength={admin ? 254 : undefined}
          disabled={loading}
          onBeforeInput={admin ? undefined : input.handleBeforeInput}
          onChange={admin ? (event) => setEmail(event.target.value) : input.handleChange}
          onBlur={admin ? undefined : input.handleBlur}
          error={problem ? t((admin ? EMAIL_ERROR_KEY : CONTACT_ERROR_KEY)[problem]) : undefined}
        />
        <Button type="submit" fullWidth loading={loading}>
          {t('reset.email.submit')}
        </Button>
        <AuthNote text={t('reset.email.remembered')} link={t('reset.email.login')} href={links.login} />
      </form>
    </AuthLayout>
  );
}

/** Reset step 3: the new password (updateUser). */
export function ResetPasswordNewScreen({ admin = false, loading, rejected, unavailable, onSubmit }: { admin?: boolean; loading?: boolean; rejected?: boolean; unavailable?: boolean; onSubmit?: (password: string) => void }) {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const problem = submitted ? validateNewPassword(password) : null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!validateNewPassword(password)) onSubmit?.(password);
  };
  return (
    <AuthLayout admin={admin}>
      <form className="auth__form" noValidate onSubmit={submit}>
        <AuthHead badge={t('common.step', { n: 3 })} title={t('reset.newPassword.title')} subtitle={t('reset.newPassword.subtitle')} />
        {unavailable ? (
          <Alert tone="danger" title={t('reset.errors.unavailableTitle')}>{t('reset.errors.unavailableBody')}</Alert>
        ) : null}
        <PasswordField
          label={t('reset.newPassword.label')}
          autoComplete="new-password"
          hint={t('common.passwordHint')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={problem ? t(PASSWORD_ERROR_KEY[problem]) : rejected ? t('signup.errors.passwordWeak') : undefined}
          showLabel={t('common.showPassword')}
          hideLabel={t('common.hidePassword')}
        />
        <Button type="submit" fullWidth loading={loading}>
          {t('reset.newPassword.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}

/** Reset done. */
export function ResetPasswordDoneScreen({ admin = false }: { admin?: boolean }) {
  const { t } = useI18n();
  const links = useAuthLinks();
  return (
    <AuthLayout admin={admin}>
      <div className="auth__form">
        <AuthHead icon="check-circle" success title={t('reset.done.title')} subtitle={t('reset.done.subtitle')} />
        <Button href={links.login} fullWidth iconRight="arrow-right">
          {t('reset.done.submit')}
        </Button>
      </div>
    </AuthLayout>
  );
}
