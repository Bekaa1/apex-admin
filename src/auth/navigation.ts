import { useCallback } from 'react'
import { useNavigate } from 'react-router'

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

export function useAuthNavigate() {
  const navigate = useNavigate()
  return useCallback((path: string, state: VerificationState | ResetPasswordState | null = null) => {
    void navigate(path, { state })
  }, [navigate])
}
