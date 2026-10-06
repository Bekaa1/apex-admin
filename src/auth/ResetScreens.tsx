import { useState, type FormEvent } from 'react';
import { Alert, Button, PasswordField, TextField } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { AuthHead, AuthLayout, AuthNote } from './AuthLayout';
import { useAuthLinks } from './links';
import { useContactInput } from './useContactInput';
import { CONTACT_ERROR_KEY, PASSWORD_ERROR_KEY, validateNewPassword, validateSignupContact } from './validation';

/** Reset step 1: request a password recovery code without confirming whether the contact exists. */
export type ResetPasswordStartError = 'rateLimit' | 'unavailable';

export function ResetPasswordEmailScreen({ loading, error, defaultContact = '', onSubmit }: { loading?: boolean; error?: ResetPasswordStartError | null; defaultContact?: string; onSubmit?: (contact: string) => void }) {
  const { t } = useI18n();
  const links = useAuthLinks();
  const { contact, handleBeforeInput: handleContactBeforeInput, handleChange: handleContactChange, handleBlur: handleContactBlur } = useContactInput(defaultContact);
  const [submitted, setSubmitted] = useState(false);
  const problem = submitted ? validateSignupContact(contact) : null;
  const isPhoneInput = /^[+\d]/.test(contact.trim());
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!validateSignupContact(contact)) onSubmit?.(contact.trim());
  };
  return (
    <AuthLayout back={{ href: links.login, label: t('common.backToLogin') }}>
      <form className="auth__form" noValidate onSubmit={submit}>
        <AuthHead badge={t('common.step', { n: 1 })} title={t('reset.email.title')} subtitle={t('reset.email.subtitle')} />
        {error === 'rateLimit' ? (
          <Alert tone="warning" title={t('reset.errors.rateLimitTitle')}>{t('reset.errors.rateLimitBody')}</Alert>
        ) : error === 'unavailable' ? (
          <Alert tone="danger" title={t('reset.errors.unavailableTitle')}>{t('reset.errors.unavailableBody')}</Alert>
        ) : null}
        <TextField
          label={t('signup.contactLabel')}
          type="text"
          inputMode={isPhoneInput ? 'tel' : 'email'}
          autoComplete="username"
          placeholder={t('common.contactPlaceholder')}
          value={contact}
          onBeforeInput={handleContactBeforeInput}
          onChange={handleContactChange}
          onBlur={handleContactBlur}
          error={problem ? t(CONTACT_ERROR_KEY[problem]) : undefined}
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
export function ResetPasswordNewScreen({ loading, rejected, unavailable, onSubmit }: { loading?: boolean; rejected?: boolean; unavailable?: boolean; onSubmit?: (password: string) => void }) {
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
    <AuthLayout>
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
export function ResetPasswordDoneScreen() {
  const { t } = useI18n();
  const links = useAuthLinks();
  return (
    <AuthLayout>
      <div className="auth__form">
        <AuthHead icon="check-circle" success title={t('reset.done.title')} subtitle={t('reset.done.subtitle')} />
        <Button href={links.login} fullWidth iconRight="arrow-right">
          {t('reset.done.submit')}
        </Button>
      </div>
    </AuthLayout>
  );
}
