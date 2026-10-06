import { ResetPasswordCodeScreen, VerifyEmailScreen } from './auth/CodeScreens';

// The code screens need the email from the previous step; until the auth flow passes it, take it from the URL or history state.
function getPreviewEmail() {
  const state: unknown = window.history.state;
  const stateEmail =
    typeof state === 'object' && state !== null && 'email' in state && typeof state.email === 'string' ? state.email.trim() : '';

  return new URLSearchParams(window.location.search).get('email')?.trim() || stateEmail || 'name@company.kz';
}

export function VerifyEmailRoute() {
  return <VerifyEmailScreen email={getPreviewEmail()} />;
}

export function ResetPasswordCodeRoute() {
  return <ResetPasswordCodeScreen email={getPreviewEmail()} />;
}
