import { ResetPasswordCodeScreen, VerifyEmailScreen } from './auth/CodeScreens'
import { LoginScreen } from './auth/LoginScreen'
import { DEFAULT_AUTH_LINKS } from './auth/links'
import {
  ResetPasswordDoneScreen,
  ResetPasswordEmailScreen,
  ResetPasswordNewScreen,
} from './auth/ResetScreens'
import { SignupScreen } from './auth/SignupScreen'
import { Landing } from './landing/Landing'

function getPreviewEmail() {
  const state: unknown = window.history.state
  const stateEmail =
    typeof state === 'object' &&
    state !== null &&
    'email' in state &&
    typeof state.email === 'string'
      ? state.email.trim()
      : ''

  return new URLSearchParams(window.location.search).get('email')?.trim() || stateEmail || 'name@company.kz'
}

function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'

  switch (pathname) {
    case DEFAULT_AUTH_LINKS.login:
      return <LoginScreen />
    case DEFAULT_AUTH_LINKS.signup:
      return <SignupScreen />
    case DEFAULT_AUTH_LINKS.verify:
      return <VerifyEmailScreen email={getPreviewEmail()} />
    case DEFAULT_AUTH_LINKS.resetEmail:
      return <ResetPasswordEmailScreen />
    case DEFAULT_AUTH_LINKS.resetCode:
      return <ResetPasswordCodeScreen email={getPreviewEmail()} />
    case DEFAULT_AUTH_LINKS.resetNew:
      return <ResetPasswordNewScreen />
    case DEFAULT_AUTH_LINKS.resetDone:
      return <ResetPasswordDoneScreen />
    default:
      return <Landing loginHref={DEFAULT_AUTH_LINKS.login} startHref={DEFAULT_AUTH_LINKS.signup} />
  }
}

export default App
