import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './design-system/styles.css'
import './landing/landing.css'
import App from './App.tsx'
import { ThemeProvider } from './design-system'
import { I18nProvider } from './i18n/i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>,
)
