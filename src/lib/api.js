import axios from 'axios'
import { useAuthStore } from '../store/authStore.js'

// Dev: call the same-origin `/api` path, which vite.config.js proxies to the
// backend (no CORS). Production: call the backend URL from the environment
// directly. The real backend URL is never hardcoded — it lives in VITE_API_BASE_URL.
const BASE_URL = import.meta.env.DEV ? '/api' : import.meta.env.VITE_API_BASE_URL

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export const api = axios.create({
  baseURL: BASE_URL,
  // Skip ngrok's HTML interstitial on the first API call from a fresh browser.
  // Scoped to this instance (not global axios) so the direct-to-S3 photo PUT
  // stays header-clean. Ignored by non-ngrok backends.
  headers: { 'ngrok-skip-browser-warning': 'true' },
})

// Attach the JWT to every request unless the call opts out with { auth: false }.
api.interceptors.request.use((config) => {
  if (config.auth !== false) {
    const token = useAuthStore.getState().token
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Unwrap to response.data on success; convert failures to ApiError with the
// server's message so screens can show it inline instead of a generic string.
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.error || 'Something went wrong. Please try again.'
    return Promise.reject(new ApiError(message, err.response?.status))
  },
)
