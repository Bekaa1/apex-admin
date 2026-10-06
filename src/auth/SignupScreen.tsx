import { useState, type FormEvent } from 'react';
import { Button, Checkbox, PasswordField, TextField } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { AuthHead, AuthLayout, AuthNote } from './AuthLayout';
import { useAuthLinks } from './links';
import { CONTACT_ERROR_KEY, PASSWORD_ERROR_KEY, validateNewPassword, validateSignupContact } from './validation';

export interface SignupScreenProps {
  loading?: boolean;
  /** The email or phone number is already registered. */
  contactTaken?: boolean;
  /** Server rejected the password (weak_password). */
  passwordRejected?: boolean;
  defaultValues?: { contact?: string; password?: string; terms?: boolean };
  /** Show validation errors immediately (used for previews of the error state). */
  showErrors?: boolean;
  onSubmit?: (values: { contact: string; password: string }) => void;
}

/** Sign-up asks only for a contact, password and consent. Company name and БИН come later, in onboarding. */
export function SignupScreen({ loading, contactTaken, passwordRejected, defaultValues, showErrors, onSubmit }: SignupScreenProps) {
  const { t, tRich } = useI18n();
  const links = useAuthLinks();
  const [contact, setContact] = useState(defaultValues?.contact ?? '');
  const [password, setPassword] = useState(defaultValues?.password ?? '');
  const [terms, setTerms] = useState(defaultValues?.terms ?? false);
  const [submitted, setSubmitted] = useState(Boolean(showErrors));

  const contactProblem = submitted ? validateSignupContact(contact) : null;
  const passwordProblem = submitted ? validateNewPassword(password) : null;
  const contactError = contactProblem ? t(CONTACT_ERROR_KEY[contactProblem]) : contactTaken ? t('signup.errors.contactTaken') : undefined;
  const passwordError = passwordProblem ? t(PASSWORD_ERROR_KEY[passwordProblem]) : passwordRejected ? t('signup.errors.passwordWeak') : undefined;
  const termsError = submitted && !terms ? t('signup.errors.terms') : undefined;
  const isPhoneInput = /^[+\d]/.test(contact.trim());

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (validateSignupContact(contact) || validateNewPassword(password) || !terms) return;
    onSubmit?.({ contact: contact.trim(), password });
  };

  return (
    <AuthLayout>
      <form className="auth__form" noValidate onSubmit={submit}>
        <AuthHead title={t('signup.title')} subtitle={t('signup.subtitle')} />
        <TextField
          label={t('signup.contactLabel')}
          type="text"
          inputMode={isPhoneInput ? 'tel' : 'email'}
          autoComplete="username"
          placeholder={t('signup.contactPlaceholder')}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          error={contactError}
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
