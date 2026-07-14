import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from '../../../store/onboardingStore.js'
import OnboardingHeader from '../components/OnboardingHeader.jsx'
import { api, ApiError } from '../../../lib/api.js'

const MIN_TAGS = 3
const MAX_TAGS = 5

export function TagsStep() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useOnboarding()

  const [tags, setTags] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [selectedIds, setSelectedIds] = useState(profile.lifestyleTagIds)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    let active = true
    api
      .get('/reference/lifestyle-tags', { auth: false })
      .then((data) => {
        if (active) setTags(data.lifestyleTags)
      })
      .catch((err) => {
        if (active) setLoadError(err instanceof ApiError ? err.message : 'Could not load tags.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Group tags by category, preserving the order the API returned them in.
  const categories = useMemo(() => {
    const groups = []
    const byName = new Map()
    for (const tag of tags) {
      if (!byName.has(tag.category)) {
        const group = { name: tag.category, items: [] }
        byName.set(tag.category, group)
        groups.push(group)
      }
      byName.get(tag.category).items.push(tag)
    }
    return groups
  }, [tags])

  const count = selectedIds.length
  const isValid = count >= MIN_TAGS && count <= MAX_TAGS

  const toggle = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_TAGS) return prev
      return [...prev, id]
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid || isSubmitting) return

    setIsSubmitting(true)
    setApiError('')
    try {
      await api.patch('/onboarding/step/5', { lifestyleTagIds: selectedIds })
      updateProfile({ lifestyleTagIds: selectedIds })
      navigate('/onboarding/photos')
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
      setApiError(message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-6">
      <OnboardingHeader step={5} />

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col max-w-[400px] w-full mx-auto pt-6">
        <h1 className="font-display text-section-lg text-white uppercase">
          What are you into?
        </h1>
        <p className="mt-3 font-body text-[15px] text-cirkle-text-muted">
          Pick {MIN_TAGS}–{MAX_TAGS}. These show on your card and help you find your crew.
        </p>

        <div className="mt-4 flex-1 overflow-y-auto pb-4">
          {isLoading && (
            <p className="mt-4 text-center font-body text-[14px] text-cirkle-text-muted">
              Loading tags…
            </p>
          )}
          {loadError && (
            <p className="mt-4 text-center font-body text-[14px] text-red-400">
              {loadError}
            </p>
          )}

          {categories.map((category) => (
            <div key={category.name} className="mt-5 first:mt-0">
              <p className="font-body text-label uppercase font-bold text-cirkle-text-muted">
                {category.name}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {category.items.map((tag) => {
                  const isSelected = selectedIds.includes(tag.id)
                  const isDisabled = !isSelected && count >= MAX_TAGS
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggle(tag.id)}
                      disabled={isDisabled}
                      className={`px-4 py-2 rounded-full border font-body text-[13px] font-semibold transition-all duration-200 ${
                        isSelected
                          ? 'border-cirkle-yellow bg-cirkle-yellow text-cirkle-text-dark'
                          : 'border-cirkle-border-card bg-cirkle-input text-cirkle-text-light hover:border-cirkle-text-muted/50'
                      } ${isDisabled ? 'opacity-35 pointer-events-none' : ''}`}
                    >
                      {tag.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="font-body text-[13px] text-cirkle-text-muted">
          <span className={count >= MIN_TAGS ? 'font-bold text-cirkle-yellow' : 'font-bold text-white'}>
            {count}
          </span>{' '}
          of {MAX_TAGS} selected
          {count < MIN_TAGS && ` · pick at least ${MIN_TAGS}`}
        </p>

        {apiError && (
          <p className="mt-2 font-body text-[13px] text-red-400">
            {apiError}
          </p>
        )}

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="btn-primary w-full px-8 py-3.5 mt-4 mb-2 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isSubmitting ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}

export default TagsStep
