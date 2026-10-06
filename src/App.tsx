import './design-system/styles.css'
import './auth/auth.css'
import { ThemeProvider } from './design-system'
import { ResetPasswordCodeScreen } from './auth/CodeScreens'
import { DEFAULT_AUTH_LINKS } from './auth/links'
import { SignupScreen } from './auth/SignupScreen'
import { I18nProvider } from './i18n/i18n'

function App() {
  const isResetCodeScreen = window.location.pathname === DEFAULT_AUTH_LINKS.resetCode
  const resetEmail = (window.history.state as { email?: string } | null)?.email?.trim() || 'name@company.kz'

  return (
    <ThemeProvider>
      <I18nProvider>
        {isResetCodeScreen ? <ResetPasswordCodeScreen email={resetEmail} /> : <SignupScreen />}
      </I18nProvider>
    </ThemeProvider>
  )
}

export default App
