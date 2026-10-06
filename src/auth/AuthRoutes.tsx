import { Navigate, useLocation } from 'react-router';
import { ResetPasswordFlow, VerificationFlow, type ResetPasswordStep } from './AuthFlows';
import { DEFAULT_AUTH_LINKS } from './links';
import { readResetPasswordState, readVerificationState } from './routeState';

export function VerificationRoute() {
  const location = useLocation();
  // Accept history entries created before the migration to React Router.
  const legacyState: unknown = typeof window === 'undefined' ? null : window.history.state;
  const verification = readVerificationState(location.state ?? legacyState, location.search);
  return verification
    ? <VerificationFlow key={verification.channel + verification.contact + verification.purpose} verification={verification} />
    : <Navigate to={DEFAULT_AUTH_LINKS.signup} replace />;
}

export function ResetPasswordRoute({ step }: { step: ResetPasswordStep }) {
  const location = useLocation();
  const legacyState: unknown = typeof window === 'undefined' ? null : window.history.state;
  const reset = readResetPasswordState(location.state ?? legacyState, location.search);
  const actualStep = !reset && (step === 'code' || step === 'new') ? 'email' : step;
  return <ResetPasswordFlow key={actualStep} step={actualStep} contact={reset?.contact} channel={reset?.channel} />;
}
