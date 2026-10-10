import { Navigate } from 'react-router'
import { useAuth } from './useAuth.js'

export default function ProtectedRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}
