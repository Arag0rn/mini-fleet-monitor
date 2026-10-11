import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../api/client.js'
import { useAuth } from '../auth/useAuth.js'

export function useRobots() {
  const { token, logout } = useAuth()
  const [robots, setRobots] = useState([])
  const [status, setStatus] = useState('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let ignore = false
    apiFetch('/robots', { token })
      .then((data) => {
        if (ignore) return
        setRobots(data)
        setStatus('ready')
      })
      .catch((err) => {
        if (ignore) return
        if (err.status === 401) logout()
        else setStatus('error')
      })
    return () => {
      ignore = true
    }
  }, [token, logout, attempt])

  const reload = useCallback(() => {
    setStatus('loading')
    setAttempt((n) => n + 1)
  }, [])

  return { robots, status, reload }
}
