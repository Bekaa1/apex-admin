import { Navigate, useLocation } from 'react-router';
import { ResetPasswordFlow, VerificationFlow, type ResetPasswordStep } from './AuthFlows';
import { DEFAULT_AUTH_LINKS } from './links';
import { readResetPasswordState, readVerificationState } from './routeState';
import { adminReturnTo } from '../navigation/returnTo';
import { supabase } from '../lib/supabase';
import { AuthLayout } from './AuthLayout';
import { Alert } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { useAuthSession } from './useAuthSession';
import { SessionLoading } from './RequireSession';
import { validateEmail } from './validation';

export function VerificationRoute() {
  const location = useLocation();
  // Accept history entries created before the migration to React Router.
  const legacyState: unknown = typeof window === 'undefined' ? null : window.history.state;
  const verification = readVerificationState(location.state ?? legacyState, location.search);
  return verification
    ? <VerificationFlow key={verification.channel + verification.contact + verification.purpose} verification={verification} />
    : <Navigate to={DEFAULT_AUTH_LINKS.signup} replace />;
}

export function ResetPasswordRoute({ step, admin = false }: { step: ResetPasswordStep; admin?: boolean }) {
  const location = useLocation();
  const { session, status } = useAuthSession();
  const { t } = useI18n();
  const legacyState: unknown = typeof window === 'undefined' ? null : window.history.state;
  const resetState = readResetPasswordState(location.state ?? legacyState, location.search);
  // Public recovery retains the existing email/SMS scenario from main.
  // Admin recovery below accepts email only and checks the recovery session.
  if (!admin) {
    const actualStep = !resetState && (step === 'code' || step === 'new') ? 'email' : step;
    return <ResetPasswordFlow key={actualStep} step={actualStep} contact={resetState?.contact} channel={resetState?.channel} />;
  }
  const reset = resetState?.channel === 'email' && !validateEmail(resetState.contact) ? resetState : null;
  const state: unknown = location.state;
  const completed = state !== null && typeof state === 'object' && 'completed' in state && state.completed === true;
  if (!supabase) return <AuthLayout admin><Alert title={t('adminAuth.notConfigured')} /></AuthLayout>;
  if (step === 'new' && status === 'loading') return <SessionLoading admin />;
  if ((!reset && (step === 'code' || step === 'new')) || (step === 'new' && !session) || (step === 'done' && !completed)) {
    const next = adminReturnTo(location.search);
    return <Navigate to={DEFAULT_AUTH_LINKS.resetEmail + (next ? '?next=' + encodeURIComponent(next) : '')} replace />;
  }
  return <ResetPasswordFlow admin key={step} step={step} contact={reset?.contact} channel={reset?.channel} />;
}
