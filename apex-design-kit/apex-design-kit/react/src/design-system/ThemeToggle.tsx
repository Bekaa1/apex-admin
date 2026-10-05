import { IconButton } from './IconButton';
import { useTheme } from './theme';

export interface ThemeToggleProps {
  /** Accessible labels in the current language. */
  labels?: { toDark: string; toLight: string };
  className?: string;
}

/** Moon in the light theme (switch to dark), sun in the dark theme (switch to light). */
export function ThemeToggle({ labels = { toDark: 'Включить тёмную тему', toLight: 'Включить светлую тему' }, className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  return <IconButton className={className} icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? labels.toLight : labels.toDark} onClick={toggleTheme} />;
}
