import './design-system/styles.css'
import './auth/auth.css'
import { ThemeProvider } from './design-system'
import { SignupScreen } from './auth/SignupScreen'
import { I18nProvider } from './i18n/i18n'

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <SignupScreen />
      </I18nProvider>
    </ThemeProvider>
  )
}

export default App
