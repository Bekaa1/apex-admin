import { useState, type FormEvent } from 'react';
import { Alert, Button, FieldAction, PasswordField, TextField } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { AuthHead, AuthLayout, AuthNote } from './AuthLayout';
import { useAuthLinks } from './links';
import { useContactInput } from './useContactInput';
import { CONTACT_ERROR_KEY, EMAIL_ERROR_KEY, validateEmail, validateSignupContact } from './validation';

/** Server-side outcomes of signInWithPassword (see supabaseAuth.ts). */
export type LoginError = 'invalid' | 'unconfirmed' | 'ratelimit' | 'unavailable';

export interface LoginScreenProps {
  admin?: boolean;
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

export function LoginScreen({ admin = false, loading, emailCodeLoading, error, email: sentTo, defaultEmail = '', defaultPassword = '', onSubmit, onEmailCode }: LoginScreenProps) {
  const { t } = useI18n();
  const links = useAuthLinks();
  const input = useContactInput(defaultEmail);
  const [email, setEmail] = useState(defaultEmail);
  const contact = admin ? email : input.contact;
  const validate = admin ? validateEmail : validateSignupContact;
  const [password, setPassword] = useState(defaultPassword);
  const [submitted, setSubmitted] = useState(false);

  const contactProblem = submitted ? validate(contact) : null;
  const passwordMissing = submitted && !password;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (loading || validate(contact) || !password) return;
    void onSubmit?.({ contact: contact.trim(), password });
  };
  const requestEmailCode = () => {
    setSubmitted(true);
    if (validateSignupContact(contact)) return;
    void onEmailCode?.(contact.trim());
  };
  const isPhoneInput = /^[+\d]/.test(contact.trim());

  return (
    <AuthLayout admin={admin} showHomeLink={!admin} showLegalLinks={false}>
      <form className="auth__form" noValidate onSubmit={submit}>
        <AuthHead title={t(admin ? 'adminAuth.loginTitle' : 'login.title')} subtitle={t(admin ? 'adminAuth.loginSubtitle' : 'login.subtitle')} />

        {error === 'invalid' ? (
          <Alert tone="danger" title={t('login.errors.invalidTitle')}>
            {t('login.errors.invalidBody')}
          </Alert>
        ) : null}
        {error === 'unconfirmed' ? (
          <Alert tone="info" title={t('login.errors.unconfirmedTitle')}>
            {t(admin ? 'adminAuth.unconfirmed' : 'login.errors.unconfirmedBody', { email: sentTo || contact })}
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
          label={t(admin ? 'adminAuth.email' : 'login.emailLabel')}
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
          error={contactProblem ? t((admin ? EMAIL_ERROR_KEY : CONTACT_ERROR_KEY)[contactProblem]) : undefined}
        />
        <PasswordField
          label={t('common.password')}
          autoComplete="current-password"
          disabled={loading}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordMissing ? t('login.errors.required') : undefined}
          labelAction={<FieldAction href={links.resetEmail}>{t('login.forgot')}</FieldAction>}
          showLabel={t('common.showPassword')}
          hideLabel={t('common.hidePassword')}
        />

        <Button type="submit" fullWidth loading={loading} disabled={emailCodeLoading || (!admin && error === 'ratelimit')}>
          {t('login.submit')}
        </Button>
        {!admin && !isPhoneInput ? (
          <Button type="button" variant="secondary" fullWidth loading={emailCodeLoading} disabled={loading || error === 'ratelimit'} onClick={requestEmailCode}>
            {t('login.emailCode')}
          </Button>
        ) : null}

        {!admin ? <AuthNote text={t('login.noAccount')} link={t('login.signup')} href={links.signup} /> : null}
      </form>
    </AuthLayout>
  );
}
