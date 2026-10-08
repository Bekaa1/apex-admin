import { AppLink } from '../design-system/AppLink';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Checkbox, PasswordField, TextField } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { AuthHead, AuthLayout, AuthNote } from './AuthLayout';
import { useAuthLinks } from './links';
import { useContactInput } from './useContactInput';
import { useSignupConsent } from './signupConsent';
import { EMAIL_ERROR_KEY, PASSWORD_ERROR_KEY, normalizeKazakhstanPhone, validateEmail, validateNewPassword } from './validation';

export interface SignupValues { email: string; phone: string; password: string }

export interface SignupScreenProps {
  loading?: boolean;
  /** The email or phone number is already registered. */
  contactTaken?: boolean;
  /** Server rejected the password (weak_password). */
  passwordRejected?: boolean;
  /** Supabase is temporarily limiting signup or code requests. */
  rateLimited?: boolean;
  unavailable?: boolean;
  defaultValues?: { email?: string; phone?: string; password?: string; terms?: boolean };
  /** Show validation errors immediately (used for previews of the error state). */
  showErrors?: boolean;
  onSubmit?: (values: SignupValues) => void | Promise<void>;
  onContactChange?: () => void;
  onResetPassword?: () => void;
}

/** Both contacts are required; company details follow their OTP confirmation. */
export function SignupScreen({ loading, contactTaken, passwordRejected, rateLimited, unavailable, defaultValues, showErrors, onSubmit, onContactChange, onResetPassword }: SignupScreenProps) {
  const { t, tRich } = useI18n();
  const links = useAuthLinks();
  const returnToSignup = `?returnTo=${encodeURIComponent(links.signup)}`;
  const [email, setEmail] = useState(defaultValues?.email ?? '');
  const { contact: phone, handleBeforeInput, handleChange, handleBlur } = useContactInput(defaultValues?.phone ?? '');
  const [password, setPassword] = useState(defaultValues?.password ?? '');
  const { accepted: terms, setAllAccepted: setTerms } = useSignupConsent(defaultValues?.terms);
  const [submitted, setSubmitted] = useState(Boolean(showErrors));

  const emailProblem = submitted ? validateEmail(email) : null;
  const passwordProblem = submitted ? validateNewPassword(password) : null;
  const emailError = emailProblem ? t(EMAIL_ERROR_KEY[emailProblem]) : undefined;
  const phoneError = submitted && !normalizeKazakhstanPhone(phone)
    ? t(phone.trim() ? 'signup.errors.phoneFormat' : 'login.errors.required') : undefined;
  const passwordError = passwordProblem ? t(PASSWORD_ERROR_KEY[passwordProblem]) : passwordRejected ? t('signup.errors.passwordWeak') : undefined;
  const termsError = submitted && !terms ? t('signup.errors.terms') : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (loading || validateEmail(email) || !normalizeKazakhstanPhone(phone) || validateNewPassword(password) || !terms) return;
    void onSubmit?.({ email: email.trim(), phone: phone.trim(), password });
  };

  return (
    <AuthLayout showHomeLink showLegalLinks={false}>
      <form className="auth__form" noValidate onSubmit={submit}>
        <AuthHead badge={t('signup.step1')} title={t('signup.title')} subtitle={t('signup.subtitle')} />
        {contactTaken ? (
          <Alert tone="warning" title={t('signup.errors.contactTakenTitle')}>
            {t('signup.errors.contactTakenBody')}{' '}
            <AppLink
              className="auth__link"
              href={links.resetEmail}
              onClick={(event) => {
                if (!onResetPassword) return
                event.preventDefault()
                onResetPassword()
              }}
            >
              {t('signup.errors.resetPassword')}
            </AppLink>
          </Alert>
        ) : rateLimited ? (
          <Alert tone="danger" title={t('signup.errors.rateLimitTitle')}>
            {t('signup.errors.rateLimitBody')}
          </Alert>
        ) : unavailable ? (
          <Alert tone="danger" title={t('signup.errors.unavailableTitle')}>
            {t('signup.errors.unavailableBody')}
          </Alert>
        ) : null}
        <TextField
          label={t('common.email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t('common.emailPlaceholder')}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            onContactChange?.()
          }}
          error={emailError}
          disabled={loading}
          required
        />
        <TextField
          label={t('signup.phoneLabel')}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="701 123 45 67"
          value={phone}
          onBeforeInput={handleBeforeInput}
          onChange={handleChange}
          onBlur={handleBlur}
          error={phoneError}
          disabled={loading}
          required
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
          disabled={loading}
          required
        />
        <Checkbox className="signup__terms" checked={terms} onChange={(e) => setTerms(e.target.checked)} error={termsError} disabled={loading}>
          {tRich('signup.terms', {
            offer: (chunk) => <AppLink href={`${links.offer}${returnToSignup}`}>{chunk}</AppLink>,
            privacy: (chunk) => <AppLink href={`${links.privacy}${returnToSignup}`}>{chunk}</AppLink>,
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
