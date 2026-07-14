import axios from 'axios'

const BASE_URL = 'http://localhost:3000'
const TOKEN_KEY = 'cirkle_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export const api = axios.create({ baseURL: BASE_URL })

// Attach the JWT to every request unless the call opts out with { auth: false }.
api.interceptors.request.use((config) => {
  if (config.auth !== false) {
    const token = getToken()
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
