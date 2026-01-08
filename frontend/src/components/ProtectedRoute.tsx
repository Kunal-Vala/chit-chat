import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { JSX } from 'react'

/**
 * Route guard that blocks unauthenticated users and redirects them to /login.
 * Wrap protected routes with this component inside the router tree.
 */
export default function ProtectedRoute(): JSX.Element {
  const { isAuthenticated } = useAuth()

  // If no session, bounce the user to login and replace history to avoid back-nav loops.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Render nested routes when authenticated.
  return <Outlet />
}
