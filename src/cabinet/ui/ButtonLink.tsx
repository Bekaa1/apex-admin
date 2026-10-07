import { Link, type LinkProps } from 'react-router';
import { buttonClassName, Icon, type ButtonLook, type IconName } from '../../design-system';

export interface ButtonLinkProps extends Omit<LinkProps, 'className'>, Omit<ButtonLook, 'loading'> {
  iconLeft?: IconName;
  iconRight?: IconName;
}

/** In-app navigation with Router state and the design system's button appearance. */
export function ButtonLink({ variant, size, fullWidth, className, iconLeft, iconRight, children, ...link }: ButtonLinkProps) {
  return (
    <Link {...link} className={buttonClassName({ variant, size, fullWidth, className })}>
      {iconLeft ? <Icon name={iconLeft} /> : null}
      <span>{children}</span>
      {iconRight ? <Icon name={iconRight} /> : null}
    </Link>
  );
}
