import { LoginScreen } from './auth/LoginScreen'
import { SignupScreen } from './auth/SignupScreen'
import { Landing } from './landing/Landing'

function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'

  if (pathname === '/login') {
    return <LoginScreen />
  }

  if (pathname === '/signup') {
    return <SignupScreen />
  }

  return <Landing loginHref="/login" startHref="/signup" />
}

export default App
