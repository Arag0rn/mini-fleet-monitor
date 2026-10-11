import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client.js'
import { useAuth } from '../auth/useAuth.js'

// The paths the robots walk, as GeoJSON. Only a backdrop: if it fails, the map works without it.
export function usePatrolNetwork() {
  const { token } = useAuth()
  const [network, setNetwork] = useState(null)

  useEffect(() => {
    let ignore = false
    apiFetch('/patrol-network', { token })
      .then((data) => {
        if (!ignore) setNetwork(data)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [token])

  return network
}
