import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from '../../../store/onboardingStore.js'
import OnboardingHeader from '../components/OnboardingHeader.jsx'
import { api, ApiError } from '../../../lib/api.js'
import PhotoGrid from '../../../components/PhotoGrid.jsx'

const MIN_PHOTOS = 2
const MAX_PHOTOS = 4

export function PhotosStep() {
  const navigate = useNavigate()
  const { updateProfile } = useOnboarding()

  const [photos, setPhotos] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  const doneCount = photos.filter((p) => p.status === 'done').length
  const anyUploading = photos.some((p) => p.status === 'uploading')
  const allDone = photos.length > 0 && photos.every((p) => p.status === 'done')
  const isValid = allDone && doneCount >= MIN_PHOTOS && doneCount <= MAX_PHOTOS

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid || isSubmitting) return

    const payload = photos.map((p, i) => ({ s3Key: p.key, position: i }))
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

  return (
    <div className="min-h-screen flex flex-col px-6 py-6">
      <OnboardingHeader step={6} />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-center max-w-[400px] w-full mx-auto">
        <h1 className="font-display text-section-lg text-white uppercase">Add your photos</h1>
        <p className="mt-3 font-body text-[15px] text-cirkle-text-muted">
          Add {MIN_PHOTOS}–{MAX_PHOTOS}. Your first photo is your Main — make sure it shows your face.
        </p>

        <div className="mt-8">
          <PhotoGrid onChange={setPhotos} max={MAX_PHOTOS} />
        </div>

        <p className="mt-4 font-body text-[13px] text-cirkle-text-muted">
          <span className={doneCount >= MIN_PHOTOS ? 'font-bold text-cirkle-yellow' : 'font-bold text-white'}>
            {doneCount}
          </span>{' '}
          of {MAX_PHOTOS} added
          {doneCount < MIN_PHOTOS && ` · add at least ${MIN_PHOTOS}`}
          {anyUploading && ' · uploading…'}
        </p>

        {apiError && <p className="mt-2 font-body text-[13px] text-red-400">{apiError}</p>}

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
