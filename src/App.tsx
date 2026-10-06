import { useEffect, useState } from 'react'
import { LoginFlow, ResetPasswordFlow, SignupFlow, SignupProfileFlow, VerificationFlow } from './auth/AuthFlows'
import type { VerificationChannel, VerificationPurpose, VerificationState } from './auth/navigation'
import { DEFAULT_AUTH_LINKS } from './auth/links'
import { Landing } from './landing/Landing'
import { LegalDocumentPage } from './legal/LegalDocumentPage'

function getPathname() {
  return window.location.pathname.replace(/\/+$/, '') || '/'
}

function getResetState(): { contact: string; channel: VerificationChannel } | null {
  const state: unknown = window.history.state
  const stateObject =
    typeof state === 'object' &&
    state !== null &&
    !Array.isArray(state)
      ? state as Record<string, unknown>
      : {}

  const params = new URLSearchParams(window.location.search)
  const contact =
    params.get('contact')?.trim() ||
    (typeof stateObject.contact === 'string' ? stateObject.contact.trim() : '')
  if (!contact) return null

  const stateChannel = stateObject.channel
  const queryChannel = params.get('channel')
  const channel: VerificationChannel = stateChannel === 'sms' || stateChannel === 'email'
    ? stateChannel
    : queryChannel === 'sms' || queryChannel === 'email'
      ? queryChannel
      : contact.includes('@') ? 'email' : 'sms'

  return { contact, channel }
}

function getVerificationState(): VerificationState {
  const state: unknown = window.history.state
  const stateObject =
    typeof state === 'object' &&
    state !== null &&
    !Array.isArray(state)
      ? state as Record<string, unknown>
      : {}
  const params = new URLSearchParams(window.location.search)
  const contact =
    params.get('contact')?.trim() ||
    params.get('email')?.trim() ||
    (typeof stateObject.contact === 'string' ? stateObject.contact.trim() : '') ||
    (typeof stateObject.email === 'string' ? stateObject.email.trim() : '') ||
    'name@company.kz'
  const channel: VerificationChannel = stateObject.channel === 'sms' || stateObject.channel === 'email'
    ? stateObject.channel
    : params.get('channel') === 'sms' || (!contact.includes('@') && !params.has('email'))
      ? 'sms'
      : 'email'
  const purpose: VerificationPurpose = stateObject.purpose === 'signin' ? 'signin' : 'signup'

  return { contact, channel, purpose }
}

function App() {
  const [pathname, setPathname] = useState(getPathname)

  useEffect(() => {
    const syncPath = () => setPathname(getPathname())
    window.addEventListener('popstate', syncPath)
    return () => window.removeEventListener('popstate', syncPath)
  }, [])

  const verification = getVerificationState()
  const reset = getResetState()

  switch (pathname) {
    case DEFAULT_AUTH_LINKS.login:
      return <LoginFlow />
    case DEFAULT_AUTH_LINKS.signup:
      return <SignupFlow />
    case DEFAULT_AUTH_LINKS.verify:
      return <VerificationFlow verification={verification} />
    case DEFAULT_AUTH_LINKS.profile:
      return <SignupProfileFlow />
    case DEFAULT_AUTH_LINKS.resetEmail:
      return <ResetPasswordFlow step="email" contact={reset?.contact} channel={reset?.channel} />
    case DEFAULT_AUTH_LINKS.resetCode:
      return reset
        ? <ResetPasswordFlow step="code" contact={reset.contact} channel={reset.channel} />
        : <ResetPasswordFlow step="email" />
    case DEFAULT_AUTH_LINKS.resetNew:
      return reset
        ? <ResetPasswordFlow step="new" contact={reset.contact} channel={reset.channel} />
        : <ResetPasswordFlow step="email" />
    case DEFAULT_AUTH_LINKS.resetDone:
      return <ResetPasswordFlow step="done" />
    case DEFAULT_AUTH_LINKS.privacy:
      return <LegalDocumentPage key="privacy" kind="privacy" />
    case DEFAULT_AUTH_LINKS.offer:
      return <LegalDocumentPage key="offer" kind="offer" />
    default:
      return <Landing loginHref={DEFAULT_AUTH_LINKS.login} startHref={DEFAULT_AUTH_LINKS.signup} />
  }
}

export default App
