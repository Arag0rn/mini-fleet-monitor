import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../api/client.js'
import { useAuth } from '../auth/useAuth.js'

const isNewer = (candidate, current) => new Date(candidate.updated_at) >= new Date(current.updated_at)

function mergeSnapshot(current, snapshot) {
  return snapshot.map((robot) => {
    const known = current.find((item) => item.id === robot.id)
    return known && !isNewer(robot, known) ? known : robot
  })
}

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
        setRobots((current) => mergeSnapshot(current, data))
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

  const resync = useCallback(() => setAttempt((n) => n + 1), [])

  const applyUpdate = useCallback((robot) => {
    setRobots((current) => {
      const index = current.findIndex((item) => item.id === robot.id)
      if (index === -1) return current
      if (!isNewer(robot, current[index])) return current
      const next = current.slice()
      next[index] = robot
      return next
    })
  }, [])

  return { robots, status, reload, resync, applyUpdate }
}
