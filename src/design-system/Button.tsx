import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { buttonClassName, type ButtonSize, type ButtonVariant } from './buttonClassName';
import { Icon, type IconName } from './Icon';
import { AppLink } from './AppLink';

export type { ButtonSize, ButtonVariant };

interface ButtonOwnProps {
  /** primary — the one main action of the screen; secondary — next to it; ghost — tertiary; inverse — «Начать» in the landing header; danger — irreversible. */
  variant?: ButtonVariant;
  /** md 44px (header), lg 52px (forms, default), xl 56px (landing hero). */
  size?: ButtonSize;
  /** Shows a spinner, blocks the button, keeps the label. */
  loading?: boolean;
  iconLeft?: IconName;
  iconRight?: IconName;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

type NativeButton = ButtonOwnProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> & { href?: undefined };
type LinkButton = ButtonOwnProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonOwnProps> & { href: string };
/** With `href` the button renders as a link with the same look (navigation, not actions). */
export type ButtonProps = NativeButton | LinkButton;

export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'lg', loading, iconLeft, iconRight, fullWidth, disabled, className, children, ...rest } = props;
  const cls = buttonClassName({ variant, size, fullWidth, loading, className });
  const inactive = Boolean(disabled || loading);
  const inner = (
    <>
      {loading ? <span className="ax-spinner" aria-hidden="true" /> : iconLeft ? <Icon name={iconLeft} /> : null}
      <span>{children}</span>
      {!loading && iconRight ? <Icon name={iconRight} /> : null}
    </>
  );

  if (rest.href !== undefined) {
    const { href, ...anchor } = rest as Omit<LinkButton, keyof ButtonOwnProps>;
    return (
      <AppLink {...anchor} onClick={inactive ? (event) => event.preventDefault() : anchor.onClick} tabIndex={inactive ? -1 : anchor.tabIndex} className={cls} href={inactive ? undefined : href} aria-disabled={inactive || undefined} aria-busy={loading || undefined}>
        {inner}
      </AppLink>
    );
  }
  const { type = 'button', ...button } = rest as Omit<NativeButton, keyof ButtonOwnProps>;
  return (
    <button {...button} type={type} className={cls} disabled={inactive} aria-busy={loading || undefined}>
      {inner}
    </button>
  );
}
