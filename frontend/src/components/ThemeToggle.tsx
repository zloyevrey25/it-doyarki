import { useApp } from '../context/AppContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useApp()
  return (
    <button
      className="theme-toggle"
      type="button"
      role="switch"
      aria-checked={theme === 'dark'}
      aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
      onClick={toggleTheme}
    >
      <span aria-hidden="true">☀</span><i aria-hidden="true" /><span aria-hidden="true">☾</span>
    </button>
  )
}
