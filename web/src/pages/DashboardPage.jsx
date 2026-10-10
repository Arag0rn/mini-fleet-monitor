import { useAuth } from '../auth/useAuth.js'

export default function DashboardPage() {
  const { logout } = useAuth()
  return (
    <main>
      <h1>Dashboard</h1>
      <button type="button" onClick={logout}>
        Sign Out
      </button>
    </main>
  )
}
