import { useAuth } from '../auth/useAuth.js'
import ThemeToggle from './ThemeToggle.jsx'
import './TopBar.css'

export default function TopBar() {
  const { email, logout } = useAuth()
  return (
    <header className="topbar">
      <p className="topbar__brand">Mini-Fleet Monitor</p>
      <div className="topbar__actions">
        <span className="topbar__user" translate="no">
          {email}
        </span>
        <ThemeToggle />
        <button type="button" className="topbar__signout" onClick={logout}>
          Sign Out
        </button>
      </div>
    </header>
  )
}
