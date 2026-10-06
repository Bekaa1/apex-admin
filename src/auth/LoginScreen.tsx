import { useState, type FormEvent } from 'react';
import { Alert, Button, FieldAction, PasswordField, TextField } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { AuthHead, AuthLayout, AuthNote } from './AuthLayout';
import { useAuthLinks } from './links';
import { useContactInput } from './useContactInput';
import { CONTACT_ERROR_KEY, validateSignupContact } from './validation';

/** Server-side outcomes of signInWithPassword (see supabaseAuth.ts). */
export type LoginError = 'invalid' | 'unconfirmed' | 'ratelimit' | 'unavailable';

export interface LoginScreenProps {
  loading?: boolean;
  emailCodeLoading?: boolean;
  error?: LoginError | null;
  /** Email the code was re-sent to (for the «unconfirmed» message). */
  email?: string;
  defaultEmail?: string;
  defaultPassword?: string;
  onSubmit?: (values: { contact: string; password: string }) => void | Promise<void>;
  onEmailCode?: (email: string) => void | Promise<void>;
}

export function LoginScreen({ loading, emailCodeLoading, error, email: sentTo, defaultEmail = '', defaultPassword = '', onSubmit, onEmailCode }: LoginScreenProps) {
  const { t } = useI18n();
  const links = useAuthLinks();
  const { contact, handleBeforeInput: handleContactBeforeInput, handleChange: handleContactChange, handleBlur: handleContactBlur } = useContactInput(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [submitted, setSubmitted] = useState(false);

  const contactProblem = submitted ? validateSignupContact(contact) : null;
  const passwordMissing = submitted && !password;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (validateSignupContact(contact) || !password) return;
    void onSubmit?.({ contact: contact.trim(), password });
  };
  const requestEmailCode = () => {
    setSubmitted(true);
    if (validateSignupContact(contact)) return;
    void onEmailCode?.(contact.trim());
  };
  const isPhoneInput = /^[+\d]/.test(contact.trim());

  return (
    <AuthLayout showLegalLinks={false}>
      <form className="auth__form" noValidate onSubmit={submit}>
        <AuthHead title={t('login.title')} subtitle={t('login.subtitle')} />

        {error === 'invalid' ? (
          <Alert tone="danger" title={t('login.errors.invalidTitle')}>
            {t('login.errors.invalidBody')}
          </Alert>
        ) : null}
        {error === 'unconfirmed' ? (
          <Alert tone="info" title={t('login.errors.unconfirmedTitle')}>
            {t('login.errors.unconfirmedBody', { email: sentTo || contact })}
          </Alert>
        ) : null}
        {error === 'ratelimit' ? (
          <Alert tone="warning" title={t('login.errors.rateLimitTitle')}>
            {t('login.errors.rateLimitBody')}
          </Alert>
        ) : null}
        {error === 'unavailable' ? (
          <Alert tone="danger" title={t('login.errors.unavailableTitle')}>
            {t('login.errors.unavailableBody')}
          </Alert>
        ) : null}

        <TextField
          label={t('login.emailLabel')}
          type="text"
          inputMode={isPhoneInput ? 'tel' : 'email'}
          autoComplete="username"
          placeholder={t('common.contactPlaceholder')}
          value={contact}
          onBeforeInput={handleContactBeforeInput}
          onChange={handleContactChange}
          onBlur={handleContactBlur}
          error={contactProblem ? t(CONTACT_ERROR_KEY[contactProblem]) : undefined}
        />
        <PasswordField
          label={t('common.password')}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordMissing ? t('login.errors.required') : undefined}
          labelAction={<FieldAction href={links.resetEmail}>{t('login.forgot')}</FieldAction>}
          showLabel={t('common.showPassword')}
          hideLabel={t('common.hidePassword')}
        />

        <Button type="submit" fullWidth loading={loading} disabled={emailCodeLoading || error === 'ratelimit'}>
          {t('login.submit')}
        </Button>
        {!isPhoneInput ? (
          <Button type="button" variant="secondary" fullWidth loading={emailCodeLoading} disabled={loading || error === 'ratelimit'} onClick={requestEmailCode}>
            {t('login.emailCode')}
          </Button>
        ) : null}

        <AuthNote text={t('login.noAccount')} link={t('login.signup')} href={links.signup} />
      </form>
    </AuthLayout>
  );
}
