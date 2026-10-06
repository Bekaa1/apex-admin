import { useState, type FormEvent } from 'react';
import { Button, PasswordField, TextField } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { AuthHead, AuthLayout, AuthNote } from './AuthLayout';
import { useAuthLinks } from './links';
import { EMAIL_ERROR_KEY, PASSWORD_ERROR_KEY, validateEmail, validateNewPassword } from './validation';

/** Reset step 1: ask for the email (resetPasswordForEmail). Always continue with the same neutral text — never reveal whether the account exists. */
export function ResetPasswordEmailScreen({ loading, defaultEmail = '', onSubmit }: { loading?: boolean; defaultEmail?: string; onSubmit?: (email: string) => void }) {
  const { t } = useI18n();
  const links = useAuthLinks();
  const [email, setEmail] = useState(defaultEmail);
  const [submitted, setSubmitted] = useState(false);
  const problem = submitted ? validateEmail(email) : null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!validateEmail(email)) onSubmit?.(email.trim());
  };
  return (
    <AuthLayout back={{ href: links.login, label: t('common.backToLogin') }}>
      <form className="auth__form" noValidate onSubmit={submit}>
        <AuthHead badge={t('common.step', { n: 1 })} title={t('reset.email.title')} subtitle={t('reset.email.subtitle')} />
        <TextField
          label={t('common.email')}
          type="email"
          autoComplete="email"
          placeholder={t('common.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={problem ? t(EMAIL_ERROR_KEY[problem]) : undefined}
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
export function ResetPasswordNewScreen({ loading, rejected, onSubmit }: { loading?: boolean; rejected?: boolean; onSubmit?: (password: string) => void }) {
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
