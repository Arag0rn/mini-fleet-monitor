import { useEffect, useRef, useState } from 'react'
import { WS_URL } from '../config.js'
import { useAuth } from '../auth/useAuth.js'

const MAX_RETRY_DELAY_MS = 5000

export function useFleetSocket({ onRobot, onResync }) {
  const { token } = useAuth()
  const [connection, setConnection] = useState('connecting')
  const handlers = useRef({ onRobot, onResync })

  useEffect(() => {
    handlers.current = { onRobot, onResync }
  })

  useEffect(() => {
    let socket
    let retryTimer
    let failedAttempts = 0
    let disposed = false

    function connect() {
      socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`)
      let opened = false

      socket.onopen = () => {
        opened = true
        failedAttempts = 0
        setConnection('live')
        handlers.current.onResync()
      }

      socket.onmessage = (event) => {
        let message
        try {
          message = JSON.parse(event.data)
        } catch {
          return
        }
        if (message.type === 'robot.updated') handlers.current.onRobot(message.robot)
      }

      socket.onclose = () => {
        if (disposed) return
        setConnection('offline')
        if (!opened) handlers.current.onResync()
        const delay = Math.min(1000 * 2 ** failedAttempts, MAX_RETRY_DELAY_MS)
        failedAttempts += 1
        retryTimer = setTimeout(connect, delay)
      }
    }

    retryTimer = setTimeout(connect, 0)
    return () => {
      disposed = true
      clearTimeout(retryTimer)
      socket?.close()
    }
  }, [token])

  return connection
}
