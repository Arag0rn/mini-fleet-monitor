import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api/client.js'
import { useAuth } from '../auth/useAuth.js'

export function useSimulation() {
  const { token, logout } = useAuth()
  const [running, setRunning] = useState(null)
  const [action, setAction] = useState(null) // 'start' | 'stop' while a request is in flight
  const [failed, setFailed] = useState(null) // 'load' | 'start' | 'stop'
  const [attempt, setAttempt] = useState(0)
  // Bumped on every live state change, so an older HTTP response cannot overwrite a newer event.
  const version = useRef(0)

  const applyState = useCallback((value) => {
    version.current += 1
    setRunning(value)
  }, [])

  useEffect(() => {
    const requested = version.current
    let ignore = false
    apiFetch('/simulation', { token })
      .then((data) => {
        if (ignore || version.current !== requested) return
        setRunning(data.running)
        setFailed(null)
      })
      .catch((err) => {
        if (ignore) return
        if (err.status === 401) logout()
        else setFailed('load')
      })
    return () => {
      ignore = true
    }
  }, [token, logout, attempt])

  const refresh = useCallback(() => setAttempt((n) => n + 1), [])

  const toggle = useCallback(async () => {
    const next = running ? 'stop' : 'start'
    const requested = version.current
    setAction(next)
    setFailed(null)
    try {
      const data = await apiFetch(`/simulation/${next}`, { method: 'POST', token })
      if (version.current === requested) applyState(data.running)
    } catch (err) {
      if (err.status === 401) logout()
      else setFailed(next)
    } finally {
      setAction(null)
    }
  }, [running, token, logout, applyState])

  return { running, action, failed, toggle, refresh, applyState }
}
