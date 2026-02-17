import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import apiClient, { setStoredToken, setVolatileToken, setAuthHandlers, TOKEN_STORAGE_KEY } from '../api/axiosConfig'
import { AxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'

export type AuthUser = {
  userId: string
  username: string
  email: string
}

// Shape of error payloads returned by the API. Keeping it explicit prevents "any" leakage.
type ApiErrorData = {
  message?: string
  error?: string
  details?: Array<{ message: string }> | string[]
}

// Normalizes API errors into a human-friendly string for UI surfacing.
const extractApiErrorMessage = (data: ApiErrorData | undefined, fallback: string): string => {
  if (!data) return fallback
  if (Array.isArray(data.details)) {
    const msgs = data.details
      .map((d) => (typeof d === 'string' ? d : d.message))
      .filter(Boolean)
    if (msgs.length > 0) return msgs.join(', ')
  }
  return data.message ?? data.error ?? fallback
}

/**
 * Defines the shape of the authentication context.
 * 
 * @typedef {Object} AuthContextType
 * @property {AuthUser | null} user - The currently authenticated user object, or null if not logged in.
 * @property {string | null} token - The authentication token for the current session, or null if not authenticated.
 * @property {boolean} isAuthenticated - Flag indicating whether the user is currently authenticated.
 * @property {boolean} rememberMe - Flag indicating whether the user's session should be remembered across browser sessions.
 * @property {(email: string, password: string, remember: boolean) => Promise<void>} login - Authenticates a user with email and password credentials.
 * @property {(username: string, email: string, password: string, remember?: boolean) => Promise<void>} register - Registers a new user with username, email, and password.
 * @property {() => Promise<void>} logout - Logs out the current user and clears authentication state.
 * @property {(remember: boolean) => void} setRememberMe - Updates the remember me preference for the current session.
 */

type AuthContextType = {
  user: AuthUser | null
  userId: string | null
  token: string | null
  isAuthenticated: boolean
  rememberMe: boolean
  login: (email: string, password: string, remember: boolean) => Promise<void>
  register: (username: string, email: string, password: string, remember?: boolean) => Promise<void>
  logout: () => Promise<void>
  setRememberMe: (remember: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Safely decodes a JWT payload without verifying its signature.
 * Returns typed payload or null if decoding fails.
 */
function decodeJwt<T = unknown>(token: string): T | null {
  try {
    const [, payload] = token.split('.')
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const json = atob(padded)
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

type JwtPayload = { exp?: number }

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate()
  // Token state is initialized from storage to support reload persistence.
  const [token, setToken] = useState<string | null>(() => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_STORAGE_KEY)))
  // User state mirrors the token owner; stored to avoid re-fetching immediately after reload.
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem('user')
    return stored ? (JSON.parse(stored) as AuthUser) : null
  })
  // Remember-me preference decides whether tokens are persisted or kept in-memory.
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('remember_me')
    return stored === 'true'
  })

  // Holds the timer id for scheduled token refresh.
  const refreshTimer = useRef<number | null>(null)

  // Clears any pending refresh timer to avoid duplicate executions.
  const clearRefreshTimer = useCallback(() => {
    if (refreshTimer.current) {
      window.clearTimeout(refreshTimer.current)
      refreshTimer.current = null
    }
  }, [])

  // Plans a token refresh shortly before expiry to keep the session alive.
  const scheduleRefresh = useCallback((tok: string) => {
    clearRefreshTimer()
    const payload = decodeJwt<JwtPayload>(tok)
    if (!payload?.exp) return
    // Refresh 2 minutes before expiry to avoid race conditions.
    const refreshAt = payload.exp * 1000 - 2 * 60 * 1000
    const delay = Math.max(refreshAt - Date.now(), 0)
    const id = window.setTimeout(async () => {
      try {
        // Ask the backend for a fresh token.
        const res = await apiClient.post('/auth/refresh')
        const newToken = (res.data?.token ?? '') as string
        if (newToken) {
          // Store token based on remember preference, then cascade refresh scheduling.
          if (rememberMe) {
            setStoredToken(newToken)
            setVolatileToken(null)
          } else {
            setVolatileToken(newToken)
          }
          setToken(newToken)
          scheduleRefresh(newToken)
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // If refresh fails, force logout to clear invalid credentials.
        await handleLogout()
      }
    }, delay)
    refreshTimer.current = id
  }, [clearRefreshTimer, rememberMe])

  // Logs the user out locally and on the backend, then redirects to login.
  const handleLogout = useCallback(async () => {
    try { await apiClient.post('/auth/logout') } catch { /* ignore backend failures */ }
    setStoredToken(null)
    setVolatileToken(null)
    localStorage.removeItem('user')
    localStorage.removeItem('remember_me')
    setUser(null)
    setToken(null)
    setRememberMe(false)
    clearRefreshTimer()
    navigate('/login', { replace: true })
  }, [clearRefreshTimer, navigate])

  useEffect(() => {
    // Register global 401 handler so axios can trigger logout automatically.
    setAuthHandlers({ onLogout: handleLogout })
  }, [handleLogout])

  // Authenticates a user and hydrates state + storage based on remember choice.
  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    try {
      const res = await apiClient.post('/auth/sign_in', { email, password })
      const tok = res.data?.token as string
      const usr = res.data?.user as AuthUser
      if (!tok || !usr) throw new Error('Invalid login response')
      if (remember) {
        setStoredToken(tok)
        setVolatileToken(null)
        localStorage.setItem('user', JSON.stringify(usr))
        localStorage.setItem('remember_me', 'true')
      } else {
        setVolatileToken(tok)
        localStorage.removeItem('user')
        localStorage.setItem('remember_me', 'false')
      }
      setUser(usr)
      setToken(tok)
      setRememberMe(remember)
      scheduleRefresh(tok)
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        const apiMessage = extractApiErrorMessage(err.response?.data as ApiErrorData, 'Login failed')
        throw new Error(apiMessage)
      }
      throw new Error('Login failed')
    }
  }, [scheduleRefresh])

  // Creates a new user account, then authenticates and stores credentials.
  const register = useCallback(async (username: string, email: string, password: string, remember = true) => {
    try {
      const res = await apiClient.post('/auth/sign_up', { username, email, password })
      const tok = res.data?.token as string
      const usr = res.data?.user as AuthUser
      if (!tok || !usr) throw new Error('Invalid signup response')
      if (remember) {
        setStoredToken(tok)
        setVolatileToken(null)
        localStorage.setItem('user', JSON.stringify(usr))
        localStorage.setItem('remember_me', 'true')
      } else {
        setVolatileToken(tok)
        localStorage.removeItem('user')
        localStorage.setItem('remember_me', 'false')
      }
      setUser(usr)
      setToken(tok)
      setRememberMe(remember)
      scheduleRefresh(tok)
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        const apiMessage = extractApiErrorMessage(err.response?.data as ApiErrorData, 'Registration failed')
        throw new Error(apiMessage)
      }
      throw new Error('Registration failed')
    }
  }, [scheduleRefresh])

  // On mount, if a stored token exists, schedule refresh
  useEffect(() => {
    if (token) {
      scheduleRefresh(token)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<AuthContextType>(() => ({
    user,
    userId: user?.userId ?? null,
    token,
    isAuthenticated: !!token,
    rememberMe,
    login,
    register,
    logout: handleLogout,
    setRememberMe,
  }), [user, token, rememberMe, login, register, handleLogout])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
