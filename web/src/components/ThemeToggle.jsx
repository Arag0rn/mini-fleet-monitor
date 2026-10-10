import { useState } from 'react'
import './ThemeToggle.css'

const THEME_COLORS = { light: '#e6e8e6', dark: '#1b2024' }

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
  try {
    localStorage.setItem('theme', theme)
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this visit.
  }
}

export default function ThemeToggle() {
  const [isNight, setIsNight] = useState(() => document.documentElement.dataset.theme === 'dark')

  function toggle() {
    applyTheme(isNight ? 'light' : 'dark')
    setIsNight(!isNight)
  }

  return (
    <button type="button" className="theme-toggle" aria-pressed={isNight} onClick={toggle}>
      <span aria-hidden="true">☾</span>
      Night Shift
    </button>
  )
}
