import { Link, type LinkProps } from 'react-router';
import { Icon, iconButtonClassName, type IconButtonVariant, type IconName } from '../../design-system';

export interface IconLinkProps extends Omit<LinkProps, 'className' | 'children' | 'title'> {
  icon: IconName;
  /** Required accessible name (aria-label + tooltip). */
  label: string;
  variant?: IconButtonVariant;
}

/** In-app navigation that looks like `IconButton`. */
export function IconLink({ icon, label, variant = 'ghost', ...link }: IconLinkProps) {
  return (
    <Link {...link} className={iconButtonClassName(variant)} aria-label={label} title={label}>
      <Icon name={icon} />
    </Link>
  );
}
