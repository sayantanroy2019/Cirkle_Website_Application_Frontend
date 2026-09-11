import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api.js'

/**
 * Resolver for short share links: cirkle.live/e/<code>.
 *
 * The short code is what makes the shared link half its old length; this
 * component turns it back into the event id and replaces itself with the
 * canonical /events/:id route (which the whole app is keyed on). The hop is
 * invisible — the recipient just lands on the event.
 *
 * Auth-gated like /events/:id, so a logged-out visitor is captured at /e/code,
 * signs in, returns here, and then continues to the event.
 */
export function EventShortLink() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let active = true
    api
      .get(`/events/resolve/${code}`)
      .then((data) => {
        if (active) navigate(`/events/${data.id}`, { replace: true })
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof ApiError && err.status === 404) setNotFound(true)
        else navigate('/feed', { replace: true }) // transient error — don't dead-end
      })
    return () => {
      active = false
    }
  }, [code, navigate])

  return (
    <div className="min-h-[100dvh] bg-cirkle-black flex items-center justify-center px-6">
      {notFound ? (
        <div className="text-center">
          <p className="font-body text-[15px] text-white">This event link isn’t valid.</p>
          <button
            type="button"
            onClick={() => navigate('/feed', { replace: true })}
            className="btn-primary px-6 py-3 mt-4"
          >
            Explore events
          </button>
        </div>
      ) : (
        <p className="font-body text-[14px] text-cirkle-text-muted">Opening…</p>
      )}
    </div>
  )
}

export default EventShortLink
