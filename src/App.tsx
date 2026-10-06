import { Landing } from './landing'
import { VerifyEmailScreen } from './auth/CodeScreens'
import { ResetPasswordNewScreen } from './auth/ResetScreens'
import './auth/auth.css'

function App() {
  if (window.location.pathname === '/signup/verify') {
    const email = new URLSearchParams(window.location.search).get('email')?.trim() || 'name@company.kz'
    return <VerifyEmailScreen email={email} />
  }

  if (window.location.pathname === '/reset-password/new') {
    return <ResetPasswordNewScreen />
  }

  return (
    <Landing loginHref="/login" startHref="/signup" />
  )
}

export default App
