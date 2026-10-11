import { useAuth } from '../auth/useAuth.js'
import ThemeToggle from './ThemeToggle.jsx'
import './TopBar.css'

const CONNECTION_LABELS = {
  connecting: 'Connecting…',
  live: 'Live',
  offline: 'Offline · reconnecting…',
}

export default function TopBar({ connection }) {
  const { email, logout } = useAuth()
  return (
    <header className="topbar">
      <p className="topbar__brand">Mini-Fleet Monitor</p>
      <p className="topbar__connection" data-state={connection} role="status">
        <span className="topbar__dot" aria-hidden="true" />
        {CONNECTION_LABELS[connection]}
      </p>
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
