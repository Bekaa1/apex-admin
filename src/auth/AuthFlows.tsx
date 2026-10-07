import { postAuthDestination } from '../lib/campaignIntent'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router'
import { Alert, Button } from '../design-system'
import { useI18n } from '../i18n/i18n'
import { AuthLayout } from './AuthLayout'
import { SessionLoading } from './RequireSession'
import { useAuthSession } from './useAuthSession'
import { SignupPhoneFlow } from './SignupPhoneFlow'
import { clearSignupConsent } from './signupConsent'
import { DUAL_CONTACT_SIGNUP, hasConfirmedSignupContacts, isDualContactSignup, needsSignupContactVerification } from './signupContacts'
import { VerifyEmailScreen } from './CodeScreens'
import type { CodeError } from './CodeScreens'
import { LoginScreen } from './LoginScreen'
import type { LoginError } from './LoginScreen'
import { useAuthNavigate } from './navigation'
import type { VerificationChannel, VerificationState } from './navigation'
import { SignupScreen, type SignupValues } from './SignupScreen'
import { SignupProfileScreen } from './SignupProfileScreen'
import { ResetPasswordCodeScreen } from './CodeScreens'
import { ResetPasswordDoneScreen, ResetPasswordEmailScreen, ResetPasswordNewScreen } from './ResetScreens'
import type { ResetPasswordStartError } from './ResetScreens'
import { normalizeKazakhstanPhone, validateEmail, validateNewPassword } from './validation'
import { requireSupabase } from '../lib/supabase'
import { useAuthLinks } from './links'

function normalizeContact(contact: string): { value: string; channel: VerificationChannel } {
  if (contact.includes('@')) return { value: contact.trim().toLowerCase(), channel: 'email' }

  const phone = normalizeKazakhstanPhone(contact)
  if (!phone) throw new Error('Invalid Kazakhstan phone number')
  return { value: phone, channel: 'sms' }
}

function errorCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return ''
  return String(error.code).toLowerCase()
}

function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('status' in error)) return undefined
  const status = Number(error.status)
  return Number.isFinite(status) ? status : undefined
}

function logAuthFailure(flow: string, error: unknown, channel?: VerificationChannel) {
  if (!import.meta.env.DEV) return

  const details: Record<string, string | number | undefined> = {
    channel,
    status: errorStatus(error),
    code: errorCode(error) || undefined,
  }

  if (error && typeof error === 'object') {
    if ('name' in error && typeof error.name === 'string') details.name = error.name
    if ('message' in error && typeof error.message === 'string') {
      details.message = error.message
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
        .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[phone]')
        .slice(0, 180)
    }
  }

  console.error(`[auth:${flow}] request failed`, details)
}

function isUnconfirmed(error: unknown, channel: VerificationChannel): boolean {
  const code = errorCode(error)
  return channel === 'sms'
    ? code === 'phone_not_confirmed' || code.includes('phone_not_confirmed')
    : code === 'email_not_confirmed' || code.includes('email_not_confirmed')
}

function verificationError(error: unknown): CodeError {
  const code = errorCode(error)
  return errorStatus(error) === 400 || code.includes('invalid') || code.includes('otp_expired')
    ? 'invalid'
    : 'unavailable'
}

export function SignupFlow() {
  const navigateAuth = useAuthNavigate()
  const { t } = useI18n()
  const { session, status } = useAuthSession()
  const continuingSignup = Boolean(session && isDualContactSignup(session.user))
  const signupUser = useQuery({
    queryKey: ['signup-user', session?.user.id],
    enabled: continuingSignup,
    retry: false,
    queryFn: async () => {
      const { data, error } = await requireSupabase().auth.getUser()
      if (error) throw error
      return data.user
    },
  })
  const [loading, setLoading] = useState(false)
  const [contactTaken, setContactTaken] = useState(false)
  const [recoveryTarget, setRecoveryTarget] = useState<{ contact: string; channel: VerificationChannel } | null>(null)
  const [passwordRejected, setPasswordRejected] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const submissionInProgress = useRef(false)

  const submit = async ({ email, phone, password }: SignupValues) => {
    if (submissionInProgress.current) return
    const normalizedPhone = normalizeKazakhstanPhone(phone)
    if (validateEmail(email) || !normalizedPhone || validateNewPassword(password)) return
    submissionInProgress.current = true
    setLoading(true)
    setContactTaken(false)
    setRecoveryTarget(null)
    setPasswordRejected(false)
    setRateLimited(false)
    setUnavailable(false)

    const channel = 'email'
    try {
      const value = email.trim().toLowerCase()
      const client = requireSupabase()
      const result = await client.auth.signUp({
        email: value,
        password,
        options: { data: { signup_flow: DUAL_CONTACT_SIGNUP, signup_phone: normalizedPhone } },
      })

      if (result.error) {
        logAuthFailure('signup', result.error, channel)
        const code = errorCode(result.error)
        if (errorStatus(result.error) === 429) setRateLimited(true)
        else if (code.includes('weak_password')) setPasswordRejected(true)
        else if (code.includes('exists') || code.includes('already_registered')) {
          setContactTaken(true)
          setRecoveryTarget({ contact: value, channel })
        } else setUnavailable(true)
        return
      }

      // Supabase masks duplicate confirmed accounts with a successful response and no identities.
      if (result.data.user?.identities?.length === 0) {
        setContactTaken(true)
        setRecoveryTarget({ contact: value, channel })
        return
      }

      clearSignupConsent()
      if (result.data.session) {
        navigateAuth('/signup')
        return
      }

      navigateAuth('/signup/verify', { contact: value, channel, purpose: 'signup' })
    } catch (error) {
      logAuthFailure('signup', error, channel)
      setUnavailable(true)
    } finally {
      submissionInProgress.current = false
      setLoading(false)
    }
  }

  if (status === 'loading' || (continuingSignup && signupUser.isPending)) return <SessionLoading />
  if (continuingSignup && signupUser.isError) {
    return <AuthLayout showLegalLinks={false}><div className="auth__form">
      <Alert tone="danger" title={t('signup.errors.unavailableTitle')}>{t('signup.errors.unavailableBody')}</Alert>
      <Button onClick={() => void signupUser.refetch()}>{t('home.summary.retry')}</Button>
    </div></AuthLayout>
  }
  if (continuingSignup && signupUser.data) {
    if (hasConfirmedSignupContacts(signupUser.data)) return <Navigate to="/signup/profile" replace />
    if (signupUser.data.email_confirmed_at) return <SignupPhoneFlow key={signupUser.data.id} user={signupUser.data} />
    // Covers an interrupted email confirmation without creating another account.
    return <VerificationFlow verification={{ contact: signupUser.data.email ?? '', channel: 'email', purpose: 'signup' }} />
  }

  return (
    <SignupScreen
      loading={loading}
      contactTaken={contactTaken}
      passwordRejected={passwordRejected}
      rateLimited={rateLimited}
      unavailable={unavailable}
      onSubmit={submit}
      onContactChange={() => {
        setContactTaken(false)
        setRecoveryTarget(null)
      }}
      onResetPassword={() => {
        if (recoveryTarget) navigateAuth('/reset-password', recoveryTarget)
      }}
    />
  )
}

export type ResetPasswordStep = 'email' | 'code' | 'new' | 'done'

export function ResetPasswordFlow({
  step,
  contact = '',
  channel = 'email',
}: {
  step: ResetPasswordStep
  contact?: string
  channel?: VerificationChannel
}) {
  const navigateAuth = useAuthNavigate()
  const links = useAuthLinks()
  const [loading, setLoading] = useState(false)
  const [startError, setStartError] = useState<ResetPasswordStartError | null>(null)
  const [codeError, setCodeError] = useState<CodeError | null>(null)
  const [passwordRejected, setPasswordRejected] = useState(false)
  const [passwordUnavailable, setPasswordUnavailable] = useState(false)

  const sendResetCode = async (rawContact: string, navigateToCode: boolean) => {
    setLoading(true)
    setStartError(null)
    setCodeError(null)
    try {
      const normalized = normalizeContact(rawContact)
      const client = requireSupabase()
      const result = normalized.channel === 'sms'
        ? await client.auth.signInWithOtp({
            phone: normalized.value,
            options: { shouldCreateUser: false },
          })
        : await client.auth.resetPasswordForEmail(normalized.value)

      if (result.error) {
        logAuthFailure('password-reset-code', result.error, normalized.channel)
        if (errorStatus(result.error) === 429) {
          if (navigateToCode) setStartError('rateLimit')
          else setCodeError('unavailable')
        } else if (navigateToCode) {
          setStartError('unavailable')
        } else {
          setCodeError('unavailable')
        }
        return
      }

      if (navigateToCode) {
        navigateAuth(links.resetCode, { contact: normalized.value, channel: normalized.channel })
      }
    } catch (error) {
      logAuthFailure('password-reset-code', error)
      if (navigateToCode) setStartError('unavailable')
      else setCodeError('unavailable')
    } finally {
      setLoading(false)
    }
  }

  const submitCode = async (token: string) => {
    if (!contact) return
    setLoading(true)
    setCodeError(null)
    try {
      const client = requireSupabase()
      const result = channel === 'sms'
        ? await client.auth.verifyOtp({ phone: contact, token, type: 'sms' })
        : await client.auth.verifyOtp({ email: contact, token, type: 'recovery' })

      if (result.error) {
        logAuthFailure('password-reset-verify', result.error, channel)
        setCodeError(verificationError(result.error))
        return
      }

      navigateAuth(links.resetNew, { contact, channel })
    } catch (error) {
      logAuthFailure('password-reset-verify', error, channel)
      setCodeError('unavailable')
    } finally {
      setLoading(false)
    }
  }

  const saveNewPassword = async (password: string) => {
    setLoading(true)
    setPasswordRejected(false)
    setPasswordUnavailable(false)
    try {
      const { error } = await requireSupabase().auth.updateUser({ password })
      if (error) {
        logAuthFailure('password-reset-save', error, channel)
        if (errorCode(error).includes('weak_password')) setPasswordRejected(true)
        else setPasswordUnavailable(true)
        return
      }

      navigateAuth(links.resetDone)
    } catch (error) {
      logAuthFailure('password-reset-save', error, channel)
      setPasswordUnavailable(true)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'email') {
    return (
      <ResetPasswordEmailScreen
        loading={loading}
        error={startError}
        defaultContact={contact}
        onSubmit={(value) => void sendResetCode(value, true)}
      />
    )
  }

  if (step === 'code') {
    if (!contact) return <ResetPasswordEmailScreen loading={loading} error={startError} onSubmit={(value) => void sendResetCode(value, true)} />
    return (
      <ResetPasswordCodeScreen
        contact={contact}
        channel={channel}
        loading={loading}
        error={codeError}
        onSubmit={submitCode}
        onResend={() => void sendResetCode(contact, false)}
      />
    )
  }

  if (step === 'new') {
    return (
      <ResetPasswordNewScreen
        loading={loading}
        rejected={passwordRejected}
        unavailable={passwordUnavailable}
        onSubmit={saveNewPassword}
      />
    )
  }

  return <ResetPasswordDoneScreen />
}

export function LoginFlow() {
  const navigateAuth = useAuthNavigate()
  const [loading, setLoading] = useState(false)
  const [emailCodeLoading, setEmailCodeLoading] = useState(false)
  const [error, setError] = useState<LoginError | null>(null)

  const submit = async ({ contact, password }: { contact: string; password: string }) => {
    setLoading(true)
    setError(null)

    try {
      const { value, channel } = normalizeContact(contact)
      const client = requireSupabase()
      const credentials = channel === 'sms'
        ? { phone: value, password }
        : { email: value, password }
      const result = await client.auth.signInWithPassword(credentials)

      if (!result.error) {
        navigateAuth(postAuthDestination())
        return
      }
      logAuthFailure('password-signin', result.error, channel)

      if (isUnconfirmed(result.error, channel)) {
        const resendResult = channel === 'sms'
          ? await client.auth.signInWithOtp({ phone: value, options: { shouldCreateUser: false } })
          : await client.auth.signInWithOtp({ email: value, options: { shouldCreateUser: false } })

        if (!resendResult.error) {
          navigateAuth('/signup/verify', { contact: value, channel, purpose: 'signin' })
          return
        }
        logAuthFailure('resend-signin-code', resendResult.error, channel)
        if (errorStatus(resendResult.error) === 429) setError('ratelimit')
        else setError('unavailable')
        return
      }

      if (errorStatus(result.error) === 429) setError('ratelimit')
      else if (errorStatus(result.error) === 400 || errorCode(result.error).includes('invalid')) setError('invalid')
      else setError('unavailable')
    } catch (error) {
      logAuthFailure('password-signin', error)
      setError('unavailable')
    } finally {
      setLoading(false)
    }
  }

  const sendEmailCode = async (contact: string) => {
    setEmailCodeLoading(true)
    setError(null)

    try {
      const { value, channel } = normalizeContact(contact)
      if (channel !== 'email') {
        setError('invalid')
        return
      }

      const result = await requireSupabase().auth.signInWithOtp({
        email: value,
        options: { shouldCreateUser: false },
      })

      if (result.error) {
        logAuthFailure('email-signin-code', result.error, channel)
        if (errorStatus(result.error) === 429) setError('ratelimit')
        else setError('unavailable')
        return
      }

      navigateAuth('/signup/verify', { contact: value, channel, purpose: 'signin' })
    } catch (error) {
      logAuthFailure('email-signin-code', error, 'email')
      setError('unavailable')
    } finally {
      setEmailCodeLoading(false)
    }
  }

  return (
    <LoginScreen
      loading={loading}
      emailCodeLoading={emailCodeLoading}
      error={error}
      onSubmit={submit}
      onEmailCode={sendEmailCode}
    />
  )
}

export function VerificationFlow({ verification }: { verification: VerificationState }) {
  const navigateAuth = useAuthNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<CodeError | null>(null)
  const submissionInProgress = useRef(false)

  const submitCode = async (token: string) => {
    if (submissionInProgress.current) return
    submissionInProgress.current = true
    setLoading(true)
    setError(null)

    try {
      const client = requireSupabase()
      const result = verification.channel === 'sms'
        ? await client.auth.verifyOtp({ phone: verification.contact, token, type: 'sms' })
        : await client.auth.verifyOtp({ email: verification.contact, token, type: 'email' })

      if (result.error) {
        setError(verificationError(result.error))
        return
      }

      if (!result.data.session || !result.data.user) {
        setError('unavailable')
        return
      }
      navigateAuth(verification.purpose === 'signup'
        ? isDualContactSignup(result.data.user) ? '/signup' : '/signup/profile'
        : postAuthDestination())
    } catch {
      setError('unavailable')
    } finally {
      submissionInProgress.current = false
      setLoading(false)
    }
  }

  const resendCode = async () => {
    if (submissionInProgress.current) return
    submissionInProgress.current = true
    setLoading(true)
    setError(null)
    try {
      const client = requireSupabase()
      const result = verification.purpose === 'signin'
        ? verification.channel === 'sms'
          ? await client.auth.signInWithOtp({ phone: verification.contact, options: { shouldCreateUser: false } })
          : await client.auth.signInWithOtp({ email: verification.contact, options: { shouldCreateUser: false } })
        : verification.channel === 'sms'
          ? await client.auth.resend({ type: 'sms', phone: verification.contact })
          : await client.auth.resend({ type: 'signup', email: verification.contact })

      if (result.error) setError(errorStatus(result.error) === 429 ? 'ratelimit' : 'unavailable')
    } catch {
      setError('unavailable')
    } finally {
      submissionInProgress.current = false
      setLoading(false)
    }
  }

  return (
    <VerifyEmailScreen
      contact={verification.contact}
      channel={verification.channel}
      purpose={verification.purpose}
      backHref={verification.purpose === 'signin' ? '/login' : '/signup'}
      loading={loading}
      error={error}
      onSubmit={submitCode}
      onResend={resendCode}
    />
  )
}

export function SignupProfileFlow() {
  const navigateAuth = useAuthNavigate()
  const [checkingSession, setCheckingSession] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const { data, error } = await requireSupabase().auth.getUser()
        if (!active) return
        if (error && errorCode(error) !== 'session_not_found' && error.name !== 'AuthSessionMissingError') {
          setUnavailable(true)
          return
        }
        if (!data.user || needsSignupContactVerification(data.user)) {
          navigateAuth('/signup')
          return
        }
        setAuthenticated(true)
      } catch {
        if (active) setUnavailable(true)
      } finally {
        if (active) setCheckingSession(false)
      }
    })()

    return () => {
      active = false
    }
  }, [navigateAuth])

  const submit = async (values: { fullName: string; bin: string; companyName: string }) => {
    if (!authenticated) return
    setLoading(true)
    setUnavailable(false)

    try {
      const client = requireSupabase()
      const current = await client.auth.getUser()
      if (current.error) throw current.error
      if (needsSignupContactVerification(current.data.user)) {
        navigateAuth('/signup')
        return
      }
      const { error } = await client.rpc('complete_signup_profile', {
        p_full_name: values.fullName.trim(),
        p_bin: values.bin.trim(),
        p_company_name: values.companyName.trim(),
      })

      if (error) {
        setUnavailable(true)
        return
      }

      navigateAuth(postAuthDestination())
    } catch {
      setUnavailable(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SignupProfileScreen
      checkingSession={checkingSession}
      authenticated={authenticated}
      loading={loading}
      unavailable={unavailable}
      onSubmit={submit}
    />
  )
}
