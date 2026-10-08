import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { adminReturnTo } from '../navigation/returnTo'

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
  completed?: boolean
}

export function useAuthNavigate() {
  const navigate = useNavigate()
  const { search } = useLocation()
  return useCallback((path: string, state: VerificationState | ResetPasswordState | null = null) => {
    const next = adminReturnTo(search)
    const authPath = /^\/(?:login|signup|reset-password)(?:[/?]|$)/.test(path)
    const target = next && authPath ? `${path}${path.includes('?') ? '&' : '?'}next=${encodeURIComponent(next)}` : path
    void navigate(target, { state })
  }, [navigate, search])
}
