import axios, { type AxiosInstance } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'
// Shared token key so app state and axios stay aligned
export const TOKEN_STORAGE_KEY = 'auth_token'

const getStoredToken = (): string | null => {
	if (typeof window === 'undefined') {
		return null
	}

	return localStorage.getItem(TOKEN_STORAGE_KEY)
}

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

export const apiClient: AxiosInstance = axios.create({
	baseURL: API_BASE_URL,
	timeout: 10_000,
	headers: {
		'Content-Type': 'application/json',
	},
})

apiClient.interceptors.request.use((config) => {
	const token = getStoredToken()

	if (token) {
		config.headers = config.headers ?? {}
		config.headers.set('Authorization', `Bearer ${token}`)
	}

	return config
})


export default apiClient
