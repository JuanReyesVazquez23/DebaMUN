import { Moon, Sun } from 'lucide-react';
import { useColorScheme } from '../lib/color-scheme';

export function ThemeToggle({ className = 'icon-button' }: { className?: string }) {
  const { isDark, toggle } = useColorScheme();
  const label = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';

  return (
    <button
      type="button"
      className={className}
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={isDark}
    >
      {isDark ? <Sun aria-hidden="true" size={17} /> : <Moon aria-hidden="true" size={17} />}
    </button>
  );
}
