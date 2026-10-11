import { useCallback, useMemo, useState } from 'react'
import { apiFetch } from '../api/client.js'
import { AuthContext } from './authContext.js'

const TOKEN_KEY = 'token'

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage unavailable: the session lives in memory until the tab is closed.
  }
}

function emailFromToken(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)).email ?? null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken)

  const login = useCallback(async (email, password) => {
    const { token: newToken } = await apiFetch('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    writeToken(newToken)
    setToken(newToken)
  }, [])

  const logout = useCallback(() => {
    writeToken(null)
    setToken(null)
  }, [])

  const value = useMemo(
    () => ({ token, email: token && emailFromToken(token), login, logout }),
    [token, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
