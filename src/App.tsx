import { ThemeProvider } from './design-system'
import { LoginScreen } from './auth/LoginScreen'
import { I18nProvider } from './i18n/i18n'
import './design-system/styles.css'
import './auth/auth.css'

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <LoginScreen />
      </I18nProvider>
    </ThemeProvider>
  )
}

export default App
