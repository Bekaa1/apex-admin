import { ThemeProvider } from './design-system'
import { LoginScreen } from './auth/LoginScreen'
import { ResetPasswordDoneScreen, ResetPasswordEmailScreen } from './auth/ResetScreens'
import { I18nProvider } from './i18n/i18n'
import './design-system/styles.css'
import './auth/auth.css'

function App() {
  const pathname = window.location.pathname

  return (
    <ThemeProvider>
      <I18nProvider>
        {pathname === '/reset-password' ? (
          <ResetPasswordEmailScreen />
        ) : pathname === '/reset-password/done' ? (
          <ResetPasswordDoneScreen />
        ) : (
          <LoginScreen />
        )}
      </I18nProvider>
    </ThemeProvider>
  )
}

export default App
