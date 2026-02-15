import axios, { type AxiosInstance, AxiosError } from 'axios'

/**
 * Axios instance configuration and token utilities used across the frontend.
 * This file centralizes how we read/write tokens, attach them to requests,
 * and react to auth failures so debugging auth flows is straightforward.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api'
// Shared token key so app state and axios stay aligned
export const TOKEN_STORAGE_KEY = 'auth_token'

// Optional in-memory token (for non-remembered sessions)
// Keeps short-lived tokens out of localStorage; cleared on tab close/refresh.
let volatileToken: string | null = null

// Optional callbacks the app can register for lifecycle events (e.g., 401 logout).
type AuthHandlers = {
	onLogout?: () => void
}

const handlers: AuthHandlers = {}

/**
 * Registers auth lifecycle handlers (currently only onLogout) without overwriting
 * previous keys. Useful for wiring axios to AuthContext logout logic.
 */
export const setAuthHandlers = (h: AuthHandlers): void => {
	Object.assign(handlers, h)
}

/**
 * Reads the persisted token first (Remember Me) and falls back to the in-memory
 * token for non-remembered sessions. Returns null on server-side rendering.
 */
export const getStoredToken = (): string | null => {
	if (typeof window === 'undefined') {
		return null
	}

	return localStorage.getItem(TOKEN_STORAGE_KEY) ?? volatileToken
}

/**
 * Persists the token in localStorage (for remembered sessions). Passing null
 * removes it to avoid stale credentials.
 */
export const setStoredToken = (token: string | null): void => {
	if (typeof window === 'undefined') {
		return
	}

	if (token) {
		localStorage.setItem(TOKEN_STORAGE_KEY, token)
		return
	}

	localStorage.removeItem(TOKEN_STORAGE_KEY)
}

/**
 * Stores a token only in memory. This keeps the session ephemeral and avoids
 * persisting credentials to disk.
 */
export const setVolatileToken = (token: string | null): void => {
	volatileToken = token
}

/**
 * Preconfigured axios instance pointing at the API base URL. Sets JSON headers
 * and a sane timeout to surface network issues quickly during debugging.
 */
export const apiClient: AxiosInstance = axios.create({
	baseURL: API_BASE_URL,
	timeout: 10_000,
	headers: {
		'Content-Type': 'application/json',
	},
})

// Request interceptor: attach Authorization header when a token exists.
apiClient.interceptors.request.use((config) => {
	const token = getStoredToken()

	if (token) {
		config.headers = config.headers ?? {}
		config.headers.set('Authorization', `Bearer ${token}`)
	}

	return config
})

// Response interceptor: if the API returns 401, trigger the registered logout handler.
apiClient.interceptors.response.use(
	(response) => response,
	(error: AxiosError) => {
		if (error.response?.status === 401) {
			// Auth expired/invalidated. Trigger global logout if provided.
			try {
				handlers.onLogout?.()
			} catch {
				// noop
			}
		}
		return Promise.reject(error)
	}
)


export default apiClient
