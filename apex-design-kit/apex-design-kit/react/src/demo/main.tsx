/*
 * Demo app behind reference/*.html (built into reference/js/app.js). Not part of the product:
 * it shows the real components and screens with ?screen=…&theme=…&lang=…&variant=… query params.
 */
import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, useTheme, type Theme } from '../design-system';
import { I18nProvider, useI18n, type Lang } from '../i18n/i18n';
import {
  AuthLinksProvider,
  LoginScreen,
  ResetPasswordCodeScreen,
  ResetPasswordDoneScreen,
  ResetPasswordEmailScreen,
  ResetPasswordNewScreen,
  SignupScreen,
  VerifyEmailScreen,
  type LoginError,
} from '../auth';
import { Landing } from '../landing';
import { ComponentsGallery } from './ComponentsGallery';

const params = new URLSearchParams(window.location.search);
const initialTheme: Theme = params.get('theme') === 'dark' ? 'dark' : 'light';
const langParam = params.get('lang');
const initialLang: Lang = langParam === 'kk' || langParam === 'en' ? langParam : 'ru';
const variant = params.get('variant') ?? 'default';
const DEMO_EMAIL = 'name@company.kz';

function useHref() {
  const { theme } = useTheme();
  const { lang } = useI18n();
  return (page: string, screen?: string) => {
    const q = new URLSearchParams({ theme, lang });
    if (screen) q.set('screen', screen);
    return `${page}?${q.toString()}`;
  };
}

function DemoLinks({ children }: { children: ReactNode }) {
  const href = useHref();
  return (
    <AuthLinksProvider
      links={{
        home: href('landing.html'),
        login: href('screens.html', 'login'),
        signup: href('screens.html', 'signup'),
        verify: href('screens.html', 'verify'),
        resetEmail: href('screens.html', 'reset-email'),
        resetCode: href('screens.html', 'reset-code'),
        resetNew: href('screens.html', 'reset-new'),
        resetDone: href('screens.html', 'reset-done'),
        privacy: '#privacy',
        offer: '#offer',
      }}
    >
      {children}
    </AuthLinksProvider>
  );
}

function LoginDemo() {
  const preset: Partial<Record<string, LoginError>> = { error: 'invalid', unconfirmed: 'unconfirmed', ratelimit: 'ratelimit' };
  const filled = variant !== 'default';
  const [loading, setLoading] = useState(variant === 'loading');
  const [error, setError] = useState<LoginError | null>(preset[variant] ?? null);
  return (
    <LoginScreen
      loading={loading}
      error={error}
      email={DEMO_EMAIL}
      defaultEmail={filled ? DEMO_EMAIL : ''}
      defaultPassword={filled ? 'apexmedia2026' : ''}
      onSubmit={() => {
        // demo: pretend the server answered «wrong email or password»
        setLoading(true);
        setError(null);
        window.setTimeout(() => {
          setLoading(false);
          setError('invalid');
        }, 900);
      }}
    />
  );
}

function Screens() {
  const href = useHref();
  const go = (screen: string) => () => window.location.assign(href('screens.html', screen));
  switch (params.get('screen')) {
    case 'signup':
      return variant === 'errors' ? (
        <SignupScreen showErrors emailTaken defaultValues={{ email: DEMO_EMAIL, password: 'apex1' }} onSubmit={go('verify')} />
      ) : (
        <SignupScreen onSubmit={go('verify')} />
      );
    case 'verify':
      return (
        <VerifyEmailScreen
          email={DEMO_EMAIL}
          resendSeconds={42}
          error={variant === 'error' ? 'invalid' : variant === 'expired' ? 'expired' : null}
          defaultCode={variant === 'error' ? '481512' : undefined}
        />
      );
    case 'reset-email':
      return <ResetPasswordEmailScreen onSubmit={go('reset-code')} />;
    case 'reset-code':
      return <ResetPasswordCodeScreen email={DEMO_EMAIL} resendSeconds={42} onSubmit={go('reset-new')} />;
    case 'reset-new':
      return <ResetPasswordNewScreen onSubmit={go('reset-done')} />;
    case 'reset-done':
      return <ResetPasswordDoneScreen />;
    default:
      return <LoginDemo />;
  }
}

function LandingPage() {
  const href = useHref();
  return <Landing loginHref={href('screens.html', 'login')} startHref={href('screens.html', 'signup')} />;
}

const page = document.body.dataset.page;
const root = document.getElementById('root');

if (page === 'components') {
  (['light', 'dark'] as Theme[]).forEach((theme) => {
    const el = document.getElementById(theme);
    if (el)
      createRoot(el).render(
        <I18nProvider initialLang="ru" persist={false}>
          <ComponentsGallery theme={theme} />
        </I18nProvider>,
      );
  });
} else if (root) {
  createRoot(root).render(
    <ThemeProvider initialTheme={initialTheme} persist={false}>
      <I18nProvider initialLang={initialLang} persist={false}>
        <DemoLinks>{page === 'landing' ? <LandingPage /> : <Screens />}</DemoLinks>
      </I18nProvider>
    </ThemeProvider>,
  );
}
