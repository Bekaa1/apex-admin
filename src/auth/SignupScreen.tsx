import { useState, type FormEvent } from 'react';
import { Button, Checkbox, PasswordField, TextField } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { AuthHead, AuthLayout, AuthNote } from './AuthLayout';
import { useAuthLinks } from './links';
import { EMAIL_ERROR_KEY, PASSWORD_ERROR_KEY, validateEmail, validateNewPassword } from './validation';

export interface SignupScreenProps {
  loading?: boolean;
  /** Supabase reported the email as already registered (see supabaseAuth.signUp → alreadyRegistered). */
  emailTaken?: boolean;
  /** Server rejected the password (weak_password). */
  passwordRejected?: boolean;
  defaultValues?: { email?: string; password?: string; terms?: boolean };
  /** Show validation errors immediately (used for previews of the error state). */
  showErrors?: boolean;
  onSubmit?: (values: { email: string; password: string }) => void;
}

/** Sign-up asks only for email, password and consent. Company name and БИН come later, in onboarding. */
export function SignupScreen({ loading, emailTaken, passwordRejected, defaultValues, showErrors, onSubmit }: SignupScreenProps) {
  const { t, tRich } = useI18n();
  const links = useAuthLinks();
  const [email, setEmail] = useState(defaultValues?.email ?? '');
  const [password, setPassword] = useState(defaultValues?.password ?? '');
  const [terms, setTerms] = useState(defaultValues?.terms ?? false);
  const [submitted, setSubmitted] = useState(Boolean(showErrors));

  const emailProblem = submitted ? validateEmail(email) : null;
  const passwordProblem = submitted ? validateNewPassword(password) : null;
  const emailError = emailProblem ? t(EMAIL_ERROR_KEY[emailProblem]) : emailTaken ? t('signup.errors.emailTaken') : undefined;
  const passwordError = passwordProblem ? t(PASSWORD_ERROR_KEY[passwordProblem]) : passwordRejected ? t('signup.errors.passwordWeak') : undefined;
  const termsError = submitted && !terms ? t('signup.errors.terms') : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (validateEmail(email) || validateNewPassword(password) || !terms) return;
    onSubmit?.({ email: email.trim(), password });
  };

  return (
    <AuthLayout>
      <form className="auth__form" noValidate onSubmit={submit}>
        <AuthHead title={t('signup.title')} subtitle={t('signup.subtitle')} />
        <TextField
          label={t('common.email')}
          type="email"
          autoComplete="email"
          placeholder={t('common.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
        />
        <PasswordField
          label={t('common.password')}
          autoComplete="new-password"
          hint={t('common.passwordHint')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordError}
          showLabel={t('common.showPassword')}
          hideLabel={t('common.hidePassword')}
        />
        <Checkbox checked={terms} onChange={(e) => setTerms(e.target.checked)} error={termsError}>
          {tRich('signup.terms', {
            offer: (chunk) => <a href={links.offer}>{chunk}</a>,
            privacy: (chunk) => <a href={links.privacy}>{chunk}</a>,
          })}
        </Checkbox>
        <Button type="submit" fullWidth loading={loading}>
          {t('signup.submit')}
        </Button>
        <AuthNote text={t('signup.haveAccount')} link={t('signup.login')} href={links.login} />
      </form>
    </AuthLayout>
  );
}
