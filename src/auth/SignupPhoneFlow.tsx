import { AppLink } from '../design-system/AppLink';
import { useRef, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { Alert, Button, TextField } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { requireSupabase } from '../lib/supabase';
import { AuthHead, AuthLayout } from './AuthLayout';
import { VerifyEmailScreen, type CodeError } from './CodeScreens';
import { useAuthNavigate } from './navigation';
import { hasConfirmedSignupContacts, signupPhoneDraft } from './signupContacts';
import { useContactInput } from './useContactInput';
import { normalizeKazakhstanPhone } from './validation';

type SendError = 'taken' | 'ratelimit' | 'unavailable';

function failureDetails(error: unknown) {
  const details = error && typeof error === 'object' ? error : {};
  return {
    code: 'code' in details ? String(details.code) : '',
    status: 'status' in details ? Number(details.status) : 0,
  };
}

/** Adds a verified phone to the account already created and confirmed by email. */
export function SignupPhoneFlow({ user }: { user: User }) {
  const { t } = useI18n();
  const navigateAuth = useAuthNavigate();
  const phoneInput = useContactInput(signupPhoneDraft(user));
  // Auth persists the pending number, so reloading does not send a second SMS.
  const [sentPhone, setSentPhone] = useState(() => normalizeKazakhstanPhone(user.new_phone ?? ''));
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendError, setSendError] = useState<SendError | null>(null);
  const [codeError, setCodeError] = useState<CodeError | null>(null);
  const inProgress = useRef(false);
  const phoneError = submitted && !normalizeKazakhstanPhone(phoneInput.contact)
    ? t(phoneInput.contact.trim() ? 'signup.errors.phoneFormat' : 'login.errors.required') : undefined;

  const sendCode = async (phone: string) => {
    if (inProgress.current) return;
    inProgress.current = true;
    setLoading(true);
    setSendError(null);
    setCodeError(null);
    try {
      const { error } = await requireSupabase().auth.updateUser({ phone, data: { signup_phone: phone } });
      if (error) throw error;
      setSentPhone(phone);
    } catch (error) {
      const { code, status } = failureDetails(error);
      if (code.includes('exists') || code.includes('already_registered')) {
        setSentPhone(null);
        setSendError('taken');
      } else if (sentPhone) {
        setCodeError(status === 429 ? 'ratelimit' : 'unavailable');
      } else {
        setSendError(status === 429 ? 'ratelimit' : 'unavailable');
      }
    } finally {
      inProgress.current = false;
      setLoading(false);
    }
  };

  const verifyCode = async (token: string) => {
    if (inProgress.current || !sentPhone) return;
    inProgress.current = true;
    setLoading(true);
    setCodeError(null);
    try {
      const { data, error } = await requireSupabase().auth.verifyOtp({ phone: sentPhone, token, type: 'phone_change' });
      if (error) throw error;
      if (!data.user || data.user.id !== user.id || !hasConfirmedSignupContacts(data.user)
        || normalizeKazakhstanPhone(data.user.phone ?? '') !== sentPhone) {
        setCodeError('unavailable');
        return;
      }
      navigateAuth('/signup/profile');
    } catch (error) {
      const { code, status } = failureDetails(error);
      setCodeError(status === 429 ? 'ratelimit' : code === 'otp_expired' || code.includes('invalid') ? 'invalid' : 'unavailable');
    } finally {
      inProgress.current = false;
      setLoading(false);
    }
  };

  const changePhone = () => {
    if (inProgress.current) return;
    setSentPhone(null);
    setCodeError(null);
    setSendError(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    const phone = normalizeKazakhstanPhone(phoneInput.contact);
    if (phone) void sendCode(phone);
  };

  const changeAccount = async () => {
    if (inProgress.current) return;
    inProgress.current = true;
    setLoading(true);
    try {
      const { error } = await requireSupabase().auth.signOut({ scope: 'local' });
      if (error) throw error;
      navigateAuth('/signup');
    } catch {
      setSendError('unavailable');
    } finally {
      inProgress.current = false;
      setLoading(false);
    }
  };

  if (sentPhone) {
    return <VerifyEmailScreen
      contact={sentPhone}
      channel="sms"
      purpose="signup"
      loading={loading}
      error={codeError}
      onSubmit={verifyCode}
      onResend={() => sendCode(sentPhone)}
      onChangeContact={changePhone}
    />;
  }

  return (
    <AuthLayout showLegalLinks={false}>
      <form className="auth__form" noValidate onSubmit={submit}>
        <AuthHead badge={t('signup.step1')} title={t('verify.phoneTitle')} subtitle={t('signup.phoneSubtitle')} />
        <Alert tone="success" title={t('signup.emailConfirmed')}>{user.email}</Alert>
        <TextField
          label={t('signup.phoneLabel')}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="701 123 45 67"
          value={phoneInput.contact}
          onBeforeInput={phoneInput.handleBeforeInput}
          onChange={(event) => { phoneInput.handleChange(event); setSendError(null); }}
          onBlur={phoneInput.handleBlur}
          error={phoneError}
          disabled={loading}
          required
        />
        {sendError ? (
          <Alert tone="danger" title={t(sendError === 'taken' ? 'signup.errors.phoneTakenTitle' : sendError === 'ratelimit' ? 'signup.errors.rateLimitTitle' : 'signup.errors.phoneSendTitle')}>
            {t(sendError === 'taken' ? 'signup.errors.phoneTakenBody' : sendError === 'ratelimit' ? 'signup.errors.rateLimitBody' : 'signup.errors.unavailableBody')}
            {sendError === 'taken' ? <> <AppLink className="auth__link" href="/reset-password" onClick={(event) => {
              event.preventDefault();
              navigateAuth('/reset-password', { contact: normalizeKazakhstanPhone(phoneInput.contact) ?? phoneInput.contact, channel: 'sms' });
            }}>{t('signup.errors.resetPassword')}</AppLink></> : null}
          </Alert>
        ) : null}
        <Button type="submit" fullWidth loading={loading}>{t('signup.sendSms')}</Button>
        <Button variant="ghost" disabled={loading} onClick={() => void changeAccount()}>{t('signup.useAnotherAccount')}</Button>
      </form>
    </AuthLayout>
  );
}
