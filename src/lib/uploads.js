import axios from 'axios'
import { api, ApiError } from './api.js'

export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const UNSUPPORTED_MSG = 'Only JPEG, PNG, and WebP images are allowed.'

// Full handshake for an already-normalized image (the crop step exports WebP):
// get a signed URL → PUT bytes straight to S3 → return the key + a preview URL.
// The key is persisted later when the screen saves.
export async function uploadProfilePhoto(file, { onProgress } = {}) {
  const contentType = file.type
  if (!ALLOWED_TYPES.includes(contentType)) throw new Error(UNSUPPORTED_MSG)

  let uploadUrl
  let key
  try {
    const res = await api.post('/uploads/profile-photo-url', { contentType })
    uploadUrl = res.uploadUrl
    key = res.key
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) throw new Error(UNSUPPORTED_MSG)
    throw new Error('Could not start the upload. Please try again.')
  }

  // Direct to S3 — no auth header; the signed URL is the authorization. The
  // Content-Type must exactly match what was signed or S3 rejects it.
  await axios.put(uploadUrl, file, {
    headers: { 'Content-Type': contentType },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  })

  return { key, previewUrl: URL.createObjectURL(file) }
}

// Reads return a presigned `url` but no `s3Key`; saves need the key. The object
// key is the URL's path, so recover it from an existing photo's url.
export function keyFromPhotoUrl(url) {
  try {
    return decodeURIComponent(new URL(url).pathname).replace(/^\/+/, '')
  } catch {
    return null
  }
}
