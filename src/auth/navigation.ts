export type VerificationChannel = 'email' | 'sms'
export type VerificationPurpose = 'signup' | 'signin'

export interface VerificationState {
  contact: string
  channel: VerificationChannel
  purpose: VerificationPurpose
}

export interface ResetPasswordState {
  contact: string
  channel: VerificationChannel
}

export function navigateAuth(path: string, state: VerificationState | ResetPasswordState | null = null) {
  window.history.pushState(state, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
