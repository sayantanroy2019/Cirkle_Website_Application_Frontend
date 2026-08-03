import axios from 'axios'
import { useAuthStore } from '../store/authStore.js'

// Dev: call the same-origin `/api` path, which vite.config.js proxies to the
// backend (no CORS). Production: call the backend URL from the environment
// directly. The real backend URL is never hardcoded — it lives in VITE_API_BASE_URL.
const BASE_URL = import.meta.env.DEV ? '/api' : import.meta.env.VITE_API_BASE_URL

// In a production build the backend URL is baked in at build time. If it's
// missing, requests would silently hit the app's own origin (404) — warn loudly.
if (!import.meta.env.DEV && !BASE_URL) {
  console.error(
    '[api] VITE_API_BASE_URL is not set. Add it in the deploy environment ' +
      '(Vercel → Settings → Environment Variables) and REDEPLOY — Vite embeds env vars at build time.',
  )
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    // The raw error body. Some endpoints return a machine-readable code in
    // `error` alongside the prose — branch on `code`, never on `message`.
    this.data = data ?? null
    this.code = typeof data?.error === 'string' ? data.error : null
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

// Always resolve to a human-readable string so screens never render an object
// (which coerces to the literal "[object Object]").
function errorMessage(err) {
  const data = err.response?.data
  // Backend error shapes: { error: "..." } or { error: { message } } or { message }.
  // When both are present, `error` is a machine-readable code (e.g.
  // "social_handles_required") and `message` is the human prose — show the prose.
  if (typeof data?.error === 'string' && typeof data?.message === 'string') return data.message
  if (typeof data?.error === 'string') return data.error
  if (typeof data?.error?.message === 'string') return data.error.message
  if (typeof data?.message === 'string') return data.message
  // No response at all → the request never reached the server (network/CORS/DNS).
  if (!err.response) return 'Could not reach the server. Please check your connection and try again.'
  return 'Something went wrong. Please try again.'
}

// Unwrap to response.data on success; convert failures to ApiError otherwise.
api.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(new ApiError(errorMessage(err), err.response?.status, err.response?.data)),
)
