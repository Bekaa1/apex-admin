import { useState, type FormEvent } from 'react';
import { Alert, Button, FieldAction, PasswordField, TextField } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { AuthHead, AuthLayout, AuthNote } from './AuthLayout';
import { useAuthLinks } from './links';
import { EMAIL_ERROR_KEY, validateEmail } from './validation';

/** Server-side outcomes of signInWithPassword (see supabaseAuth.ts). */
export type LoginError = 'invalid' | 'unconfirmed' | 'ratelimit';

export interface LoginScreenProps {
  loading?: boolean;
  error?: LoginError | null;
  /** Email the code was re-sent to (for the «unconfirmed» message). */
  email?: string;
  defaultEmail?: string;
  defaultPassword?: string;
  onSubmit?: (values: { email: string; password: string }) => void;
}

export function LoginScreen({ loading, error, email: sentTo, defaultEmail = '', defaultPassword = '', onSubmit }: LoginScreenProps) {
  const { t } = useI18n();
  const links = useAuthLinks();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [submitted, setSubmitted] = useState(false);

  const emailProblem = submitted ? validateEmail(email) : null;
  const passwordMissing = submitted && !password;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (validateEmail(email) || !password) return;
    onSubmit?.({ email: email.trim(), password });
  };

  return (
    <AuthLayout>
      <form className="auth__form" noValidate onSubmit={submit}>
        <AuthHead title={t('login.title')} subtitle={t('login.subtitle')} />

        {error === 'invalid' ? (
          <Alert tone="danger" title={t('login.errors.invalidTitle')}>
            {t('login.errors.invalidBody')}
          </Alert>
        ) : null}
        {error === 'unconfirmed' ? (
          <Alert tone="info" title={t('login.errors.unconfirmedTitle')}>
            {t('login.errors.unconfirmedBody', { email: sentTo || email })}
          </Alert>
        ) : null}
        {error === 'ratelimit' ? (
          <Alert tone="warning" title={t('login.errors.rateLimitTitle')}>
            {t('login.errors.rateLimitBody')}
          </Alert>
        ) : null}

        <TextField
          label={t('common.email')}
          type="email"
          autoComplete="email"
          placeholder={t('common.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailProblem ? t(EMAIL_ERROR_KEY[emailProblem]) : undefined}
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

        <Button type="submit" fullWidth loading={loading} disabled={error === 'ratelimit'}>
          {t('login.submit')}
        </Button>

        <AuthNote text={t('login.noAccount')} link={t('login.signup')} href={links.signup} />
      </form>
    </AuthLayout>
  );
}
