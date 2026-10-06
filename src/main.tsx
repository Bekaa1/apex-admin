import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './design-system/styles.css'
import './landing/landing.css'
import './auth/auth.css'
import { QueryClientProvider } from '@tanstack/react-query'
import './legal/legal.css'
import App from './App.tsx'
import { ThemeProvider } from './design-system/theme'
import { I18nProvider } from './i18n/i18n'
import { queryClient } from './lib/queryClient'
import { AuthSessionProvider } from './auth/AuthSessionProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthSessionProvider>
            <App />
          </AuthSessionProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
