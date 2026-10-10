import { useState } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth.js'
import PatrolAreaBackdrop from '../components/PatrolAreaBackdrop.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import './LoginPage.css'

function errorMessage(err) {
  if (err.status === 401) return 'Wrong email or password. Check both and try again.'
  if (err.status === 0) return 'Cannot reach the server. Check that the API is running.'
  return err.message
}

const BOTH_FIELDS = ['email', 'password']
const isCredentialsError = (status) => status === 400 || status === 401

export default function LoginPage() {
  const { token, login } = useAuth()
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (token) return <Navigate to="/dashboard" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    const fields = event.currentTarget.elements
    const credentials = { email: fields.email.value.trim(), password: fields.password.value }
    const { email, password } = credentials
    if (!email || !password) {
      const emptyFields = BOTH_FIELDS.filter((name) => !credentials[name])
      setError({ message: 'Enter your email and password.', invalid: emptyFields })
      fields[emptyFields[0]].focus()
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError({ message: errorMessage(err), invalid: isCredentialsError(err.status) ? BOTH_FIELDS : [] })
      setSubmitting(false)
      if (isCredentialsError(err.status)) fields.email.focus()
    }
  }

  return (
    <div className="login">
      <PatrolAreaBackdrop />
      <div className="login__toolbar">
        <ThemeToggle />
      </div>

      <main className="login__panel">
        <p className="login__eyebrow">Control room · Leipzig‑Engelsdorf</p>
        <h1 className="login__title">Mini-Fleet Monitor</h1>
        <p className="login__lead">Sign in to watch the patrol robots on site.</p>

        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <label className="login__field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              spellCheck={false}
              required
              aria-invalid={error?.invalid.includes('email') || undefined}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </label>

          <label className="login__field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              aria-invalid={error?.invalid.includes('password') || undefined}
              aria-describedby={error ? 'login-error' : undefined}
            />
          </label>

          <p id="login-error" className="login__error" role="alert">
            {error?.message}
          </p>

          <button type="submit" className="login__submit" disabled={submitting}>
            {submitting ? 'Signing In…' : 'Sign In'}
          </button>
        </form>
      </main>
    </div>
  )
}
