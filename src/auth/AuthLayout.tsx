import { useEffect, useState, type ReactNode } from 'react';
import { Badge, Button, Icon, LANG_OPTIONS, Logo, LogoMark, SegmentedControl, ThemeToggle, useTheme, type IconName } from '../design-system';
import { useI18n } from '../i18n/i18n';
import { useAuthLinks } from './links';

/** Two columns on desktop: brand panel left, form right. On phones (≤760px) the panel shrinks to a header. See auth.css. */
export function AuthLayout({
  back,
  showLegalLinks = true,
  children,
}: {
  back?: { href: string; label: string; onClick?: () => void };
  showLegalLinks?: boolean;
  children: ReactNode;
}) {
  const { t, lang, setLang } = useI18n();
  const { theme } = useTheme();
  const links = useAuthLinks();
  const homeLabel = t('landing.nav.home');
  return (
    <div className="auth">
      <aside className="auth__panel">
        <div className="auth__mark auth__mark--white" aria-hidden="true">
          <LogoMark variant="white" />
        </div>
        <div className="auth__mark auth__mark--color" aria-hidden="true">
          <LogoMark />
        </div>
        <Logo className="auth__logo auth__logo--desktop" variant={theme === 'dark' ? 'color' : 'white'} size={28} href={links.home} label={homeLabel} />
        <Logo className="auth__logo auth__logo--mobile" size={30} href={links.home} label={homeLabel} />
        <div className="auth__pitch">
          <p className="auth__tagline">{t('common.tagline')}</p>
          <p className="auth__tagline-sub">{t('common.taglineSub')}</p>
        </div>
        <p className="auth__copy">{t('common.copyright')}</p>
      </aside>
      <div className="auth__main">
        <div className={back ? 'auth__top auth__top--with-back' : 'auth__top'}>
          {back ? (
            <Button variant="ghost" size="md" iconLeft="arrow-left" href={back.href} onClick={back.onClick ? (event) => { event.preventDefault(); back.onClick?.(); } : undefined}>
              {back.label}
            </Button>
          ) : null}
          <div className="auth__controls">
            <SegmentedControl label={t('common.langLabel')} options={LANG_OPTIONS} value={lang} onChange={setLang} />
            <ThemeToggle labels={{ toDark: t('common.themeToDark'), toLight: t('common.themeToLight') }} />
          </div>
        </div>
        <main className="auth__body">{children}</main>
        {showLegalLinks ? (
          <footer className="auth__footer">
            <a href={links.privacy}>{t('common.privacy')}</a>
            <a href={links.offer}>{t('common.offer')}</a>
          </footer>
        ) : null}
      </div>
    </div>
  );
}

export function AuthHead({ icon, success, badge, title, subtitle }: { icon?: IconName; success?: boolean; badge?: ReactNode; title: ReactNode; subtitle: ReactNode }) {
  return (
    <div className="auth__head">
      {icon ? (
        <div className={success ? 'auth__icon auth__icon--success' : 'auth__icon'}>
          <Icon name={icon} size={28} />
        </div>
      ) : null}
      {badge ? <Badge>{badge}</Badge> : null}
      <h1 className="auth__title">{title}</h1>
      <p className="auth__subtitle">{subtitle}</p>
    </div>
  );
}

export function AuthNote({ text, link, href }: { text: string; link: string; href: string }) {
  return (
    <p className="auth__note">
      {text}{' '}
      <a className="auth__link" href={href}>
        {link}
      </a>
    </p>
  );
}

/** «Отправить код ещё раз через 0:59» → after the countdown a resend link; plus «Не та почта? Изменить». */
export function ResendBlock({ seconds = 60, forceAvailable, onResend, changeHref, wrongContactLabel, onChangeContact, disabled }: { seconds?: number; forceAvailable?: boolean; onResend?: () => void | Promise<void>; changeHref: string; wrongContactLabel?: string; onChangeContact?: () => void; disabled?: boolean }) {
  const { t } = useI18n();
  const [left, setLeft] = useState(forceAvailable ? 0 : seconds);
  useEffect(() => {
    if (left <= 0) return;
    const id = window.setTimeout(() => setLeft(left - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left]);
  const time = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <div className="auth__links">
      {left > 0 ? (
        <p className="auth__timer">{t('common.resendIn', { time })}</p>
      ) : (
        <p>
          <a
            className="auth__link"
            href="#resend"
            onClick={(e) => {
              e.preventDefault();
              if (disabled) return;
              void onResend?.();
              setLeft(seconds);
            }}
          >
            {t('common.resend')}
          </a>
        </p>
      )}
      <p>
        {wrongContactLabel ?? t('common.wrongEmail')}{' '}
        <a className="auth__link" href={changeHref} onClick={onChangeContact ? (event) => { event.preventDefault(); if (!disabled) onChangeContact(); } : undefined}>
          {t('common.change')}
        </a>
      </p>
    </div>
  );
}
