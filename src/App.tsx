import { LoginScreen } from './auth/LoginScreen'
import { Landing } from './landing/Landing'

function App() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'

  if (pathname === '/login') {
    return <LoginScreen />
  }

  return <Landing loginHref="/login" startHref="/signup" />
}

export default App
