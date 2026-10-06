import { useState, type FormEvent } from 'react'
import { Alert, Button, TextField } from '../design-system'
import { useI18n } from '../i18n/i18n'
import { AuthHead, AuthLayout } from './AuthLayout'

export interface SignupProfileValues {
  fullName: string
  bin: string
  companyName: string
}

export interface SignupProfileScreenProps {
  checkingSession?: boolean
  authenticated?: boolean
  loading?: boolean
  unavailable?: boolean
  onSubmit?: (values: SignupProfileValues) => void | Promise<void>
}

export function SignupProfileScreen({
  checkingSession = false,
  authenticated = true,
  loading = false,
  unavailable = false,
  onSubmit,
}: SignupProfileScreenProps) {
  const { t } = useI18n()
  const [fullName, setFullName] = useState('')
  const [bin, setBin] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const fullNameError = submitted && !fullName.trim() ? t('signup.profile.errors.fullName') : undefined
  const binError = submitted && !bin.trim() ? t('signup.profile.errors.bin') : undefined
  const companyNameError = submitted && !companyName.trim() ? t('signup.profile.errors.companyName') : undefined

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    if (!fullName.trim() || !bin.trim() || !companyName.trim()) return
    void onSubmit?.({ fullName, bin, companyName })
  }

  return (
    <AuthLayout showLegalLinks={false}>
      <form className="auth__form" noValidate onSubmit={submit}>
        <AuthHead
          badge={t('signup.profile.step')}
          title={t('signup.profile.title')}
          subtitle={t('signup.profile.subtitle')}
        />
        {unavailable ? (
          <Alert tone="danger" title={t('signup.profile.errors.saveTitle')}>
            {t('signup.profile.errors.saveBody')}
          </Alert>
        ) : null}
        <TextField
          label={t('signup.profile.fullNameLabel')}
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          error={fullNameError}
          required
        />
        <TextField
          label={t('signup.profile.binLabel')}
          inputMode="numeric"
          autoComplete="off"
          value={bin}
          onChange={(event) => setBin(event.target.value)}
          error={binError}
          required
        />
        <TextField
          label={t('signup.profile.companyNameLabel')}
          autoComplete="organization"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          error={companyNameError}
          required
        />
        <Button type="submit" fullWidth loading={loading} disabled={checkingSession || !authenticated}>
          {t('signup.profile.submit')}
        </Button>
      </form>
    </AuthLayout>
  )
}
