import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { useOnboarding } from '../OnboardingContext.jsx'
import OnboardingHeader from '../components/OnboardingHeader.jsx'
import { api, ApiError } from '../../../lib/api.js'

const MIN_PHOTOS = 2
const MAX_PHOTOS = 4

export function PhotosStep() {
  const navigate = useNavigate()
  const { updateProfile } = useOnboarding()

  // Each entry: { id, url } where url is an object URL for local preview.
  const [photos, setPhotos] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const fileInputRef = useRef(null)

  // Revoke all object URLs when leaving the page (read latest via ref).
  const photosRef = useRef(photos)
  photosRef.current = photos
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  const handleFiles = (e) => {
    const files = Array.from(e.target.files)
    setPhotos((prev) => {
      const room = MAX_PHOTOS - prev.length
      const additions = files.slice(0, room).map((file) => ({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
      }))
      return [...prev, ...additions]
    })
    e.target.value = '' // allow re-selecting the same file
  }

  const removePhoto = (id) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((p) => p.id !== id)
    })
  }

  const isValid = photos.length >= MIN_PHOTOS

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid || isSubmitting) return

    // Phase 1: no real S3 upload — synthesize placeholder keys. Position 0 = Main.
    const payload = photos.map((_, i) => ({
      s3Key: `profiles/local/photo-${i}.jpg`,
      position: i,
    }))

    setIsSubmitting(true)
    setApiError('')
    try {
      await api.patch('/onboarding/step/6', { photos: payload })
      updateProfile({ photos: payload })
      navigate('/onboarding/email')
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
      setApiError(message)
      setIsSubmitting(false)
    }
  }

  const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] ?? null)
  const firstEmptyIndex = photos.length

  return (
    <div className="min-h-screen flex flex-col px-6 py-6">
      <OnboardingHeader step={6} />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-center max-w-[400px] w-full mx-auto">
        <h1 className="font-display text-section-lg text-white uppercase">
          Add your photos
        </h1>
        <p className="mt-3 font-body text-[15px] text-cirkle-text-muted">
          Add {MIN_PHOTOS}–{MAX_PHOTOS}. Your first photo is your Main — make sure it shows your face.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="hidden"
        />

        <div className="mt-8 grid grid-cols-2 gap-3">
          {slots.map((photo, i) => {
            if (photo) {
              return (
                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-cirkle-border-card">
                  <img src={photo.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  {i === 0 && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-cirkle-yellow text-cirkle-text-dark font-body text-[11px] font-bold">
                      Main
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white transition-all duration-200 hover:bg-black/80"
                    aria-label={`Remove photo ${i + 1}`}
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>
              )
            }

            const isAddSlot = i === firstEmptyIndex
            return (
              <button
                key={`empty-${i}`}
                type="button"
                onClick={isAddSlot ? () => fileInputRef.current?.click() : undefined}
                disabled={!isAddSlot}
                className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                  isAddSlot
                    ? 'border-cirkle-border-card text-cirkle-text-muted hover:border-cirkle-yellow hover:text-cirkle-yellow cursor-pointer'
                    : 'border-cirkle-border/60 text-cirkle-border-card cursor-default'
                }`}
                aria-label={isAddSlot ? 'Add photo' : `Empty slot ${i + 1}`}
              >
                <Plus size={22} strokeWidth={2} />
                {isAddSlot && <span className="font-body text-[11px] font-semibold">Add</span>}
              </button>
            )
          })}
        </div>

        <p className="mt-4 font-body text-[13px] text-cirkle-text-muted">
          <span className={photos.length >= MIN_PHOTOS ? 'font-bold text-cirkle-yellow' : 'font-bold text-white'}>
            {photos.length}
          </span>{' '}
          of {MAX_PHOTOS} added
          {photos.length < MIN_PHOTOS && ` · add at least ${MIN_PHOTOS}`}
        </p>

        {apiError && (
          <p className="mt-2 font-body text-[13px] text-red-400">
            {apiError}
          </p>
        )}

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="btn-primary w-full px-8 py-3.5 mt-6 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isSubmitting ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}

export default PhotosStep
