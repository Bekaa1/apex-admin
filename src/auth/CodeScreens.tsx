import { useState, type FormEvent } from 'react';
import { Button, OtpInput } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { AuthHead, AuthLayout, ResendBlock } from './AuthLayout';
import { useAuthLinks } from './links';

/** invalid — wrong or expired code (Supabase reports both as otp_expired); expired — client knows the code timed out and a new one was sent. */
export type CodeError = 'invalid' | 'expired';

export interface CodeScreenProps {
  /** Where the code was sent. */
  email: string;
  loading?: boolean;
  error?: CodeError | null;
  defaultCode?: string;
  /** Seconds before «Отправить код ещё раз» becomes a link (default 60). */
  resendSeconds?: number;
  /** Show the resend link right away (e.g. after an error). */
  resendAvailable?: boolean;
  onSubmit?: (code: string) => void;
  onResend?: () => void;
}

function useCodeForm(onSubmit?: (code: string) => void) {
  const [code, setCode] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code.replace(/\s/g, '').length === 6) onSubmit?.(code);
  };
  return { code, setCode, submit };
}

/** Step 3 of sign-up: confirm the email with the 6-digit code (verifyOtp type 'email'). */
export function VerifyEmailScreen({ email, loading, error, defaultCode, resendSeconds, resendAvailable, onSubmit, onResend }: CodeScreenProps) {
  const { t, tRich } = useI18n();
  const links = useAuthLinks();
  const { setCode, submit } = useCodeForm(onSubmit);
  return (
    <AuthLayout back={{ href: links.signup, label: t('common.back') }}>
      <form className="auth__form" noValidate onSubmit={submit}>
        <AuthHead icon="mail" title={t('verify.title')} subtitle={tRich('verify.subtitle', {}, { email: <strong>{email}</strong> })} />
        <OtpInput
          label={t('common.codeLabel')}
          cellLabel={t('common.codeCell')}
          defaultValue={defaultCode}
          error={error ? t(error === 'expired' ? 'verify.errors.expired' : 'verify.errors.invalid') : undefined}
          onChange={setCode}
          onComplete={(c) => onSubmit?.(c)}
        />
        <Button type="submit" fullWidth loading={loading}>
          {t('verify.submit')}
        </Button>
        <ResendBlock seconds={resendSeconds} forceAvailable={resendAvailable || Boolean(error)} onResend={onResend} changeHref={links.signup} />
      </form>
    </AuthLayout>
  );
}

/** Reset step 2: the code from the reset email (verifyOtp type 'recovery'). */
export function ResetPasswordCodeScreen({ email, loading, error, defaultCode, resendSeconds, resendAvailable, onSubmit, onResend }: CodeScreenProps) {
  const { t, tRich } = useI18n();
  const links = useAuthLinks();
  const { setCode, submit } = useCodeForm(onSubmit);
  return (
    <AuthLayout back={{ href: links.resetEmail, label: t('common.back') }}>
      <form className="auth__form" noValidate onSubmit={submit}>
        <AuthHead badge={t('common.step', { n: 2 })} title={t('reset.code.title')} subtitle={tRich('reset.code.subtitle', {}, { email: <strong>{email}</strong> })} />
        <OtpInput
          label={t('common.codeLabel')}
          cellLabel={t('common.codeCell')}
          defaultValue={defaultCode}
          error={error ? t(error === 'expired' ? 'verify.errors.expired' : 'verify.errors.invalid') : undefined}
          onChange={setCode}
          onComplete={(c) => onSubmit?.(c)}
        />
        <Button type="submit" fullWidth loading={loading}>
          {t('reset.code.submit')}
        </Button>
        <ResendBlock seconds={resendSeconds} forceAvailable={resendAvailable || Boolean(error)} onResend={onResend} changeHref={links.resetEmail} />
      </form>
    </AuthLayout>
  );
}
