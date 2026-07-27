import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import { api, ApiError } from '../lib/api.js'
import { getLifestyleTags } from '../lib/reference.js'
import { useProfileStore } from '../store/profileStore.js'
import PhotoGrid from '../components/PhotoGrid.jsx'
import { keyFromPhotoUrl } from '../lib/uploads.js'

const MIN_NAME = 2
const MIN_PHOTOS = 2
const MAX_PHOTOS = 4
const MIN_TAGS = 3
const MAX_TAGS = 5
const BIO_MAX = 300

// Phone isn't exposed by the API yet — mock value for the locked row.
const MOCK_PHONE = '+91 98765 43210'

// Shimmer placeholder shaped like the form while the profile loads.
function EditProfileSkeleton() {
  return (
    <div className="px-6 py-6 max-w-[480px] mx-auto animate-pulse">
      <div className="h-3 w-16 rounded bg-cirkle-input" />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="aspect-square rounded-xl bg-cirkle-input" />
        <div className="aspect-square rounded-xl bg-cirkle-input" />
        <div className="aspect-square rounded-xl bg-cirkle-input" />
        <div className="aspect-square rounded-xl bg-cirkle-input" />
      </div>
      <div className="mt-7 flex flex-col gap-4">
        <div className="h-[46px] rounded-[10px] bg-cirkle-input" />
        <div className="h-[46px] rounded-[10px] bg-cirkle-input" />
        <div className="h-[46px] rounded-[10px] bg-cirkle-input" />
        <div className="h-24 rounded-[10px] bg-cirkle-input" />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <div className="h-8 w-20 rounded-full bg-cirkle-input" />
        <div className="h-8 w-16 rounded-full bg-cirkle-input" />
        <div className="h-8 w-24 rounded-full bg-cirkle-input" />
        <div className="h-8 w-14 rounded-full bg-cirkle-input" />
      </div>
    </div>
  )
}

export function EditProfile() {
  const navigate = useNavigate()

  const profile = useProfileStore((s) => s.profile)
  const profileError = useProfileStore((s) => s.error)
  const fetchProfile = useProfileStore((s) => s.fetchProfile)
  const applyProfileUpdate = useProfileStore((s) => s.applyUpdate)

  const [allTags, setAllTags] = useState([])
  const [tagsError, setTagsError] = useState('')
  const [seeded, setSeeded] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [bio, setBio] = useState('')
  // Reported by PhotoGrid: { uid, key, previewUrl, status, ... }
  const [photos, setPhotos] = useState([])
  const [selectedTagIds, setSelectedTagIds] = useState([])

  const [isSaving, setIsSaving] = useState(false)
  const [apiError, setApiError] = useState('')

  // Ensure the shared profile is loaded and fetch the tag catalogue.
  useEffect(() => {
    fetchProfile()
    getLifestyleTags()
      .then(setAllTags)
      .catch(() => setTagsError('Could not load tags.'))
  }, [fetchProfile])

  // Seed the editable form once from the cached profile (usually already there).
  useEffect(() => {
    if (!profile || seeded) return
    setFirstName(profile.firstName ?? '')
    setLastName(profile.lastName ?? '')
    setBio(profile.bio ?? '')
    setSelectedTagIds(profile.lifestyleTags.map((t) => t.id))
    setSeeded(true)
  }, [profile, seeded])

  const isLoading = !seeded && !profileError
  const loadError = profileError || tagsError

  // Existing photos for the grid: recover the s3Key from the presigned url.
  const initialPhotos = useMemo(
    () =>
      profile
        ? [...profile.photos]
            .sort((a, b) => a.position - b.position)
            .map((ph) => ({
              uid: ph.id,
              key: keyFromPhotoUrl(ph.url),
              previewUrl: ph.url,
              status: 'done',
              isObjectUrl: false,
            }))
        : [],
    [profile],
  )

  const categories = useMemo(() => {
    const groups = []
    const byName = new Map()
    for (const tag of allTags) {
      if (!byName.has(tag.category)) {
        const group = { name: tag.category, items: [] }
        byName.set(tag.category, group)
        groups.push(group)
      }
      byName.get(tag.category).items.push(tag)
    }
    return groups
  }, [allTags])

  const toggleTag = (id) => {
    setSelectedTagIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_TAGS) return prev
      return [...prev, id]
    })
  }

  const tagCount = selectedTagIds.length
  const nameValid = firstName.trim().length >= MIN_NAME && lastName.trim().length >= MIN_NAME
  const photosAllDone = photos.length > 0 && photos.every((p) => p.status === 'done')
  const photosValid = photosAllDone && photos.length >= MIN_PHOTOS && photos.length <= MAX_PHOTOS
  const anyUploading = photos.some((p) => p.status === 'uploading')
  const tagsValid = tagCount >= MIN_TAGS && tagCount <= MAX_TAGS
  const canSave = nameValid && photosValid && tagsValid && !isSaving

  const handleSave = async () => {
    if (!canSave) return
    setIsSaving(true)
    setApiError('')
    const payloadPhotos = photos.map((p, i) => ({ s3Key: p.key, position: i }))
    try {
      await api.patch('/profile/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
        lifestyleTagIds: selectedTagIds,
        photos: payloadPhotos,
      })
      // Update the shared profile in place (PATCH returns no body) so Profile
      // shows the new values instantly without a refetch. Photos keep their
      // preview urls for now; a later fetch brings fresh presigned urls.
      applyProfileUpdate({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
        lifestyleTags: selectedTagIds
          .map((id) => allTags.find((t) => t.id === id))
          .filter(Boolean),
        photos: photos.map((p, i) => ({ id: p.uid, url: p.previewUrl, position: i })),
      })
      navigate('/profile')
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Could not save. Please try again.')
      setIsSaving(false)
    }
  }

  const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] ?? null)
  const firstEmpty = photos.length

  return (
    <div className="min-h-screen">
      {/* Header: back · title · save */}
      <header className="sticky top-0 z-40 bg-cirkle-black border-b border-cirkle-border flex items-center justify-between px-4 h-14">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center text-white transition-all duration-200 hover:opacity-70 -ml-1.5"
          aria-label="Back"
        >
          <ArrowLeft size={22} strokeWidth={2} />
        </button>
        <h1 className="font-body text-[16px] font-semibold text-white">Edit profile</h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="font-body text-[15px] font-bold text-cirkle-yellow transition-all duration-200 hover:text-cirkle-yellow-hover disabled:opacity-40 disabled:pointer-events-none"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </header>

      {isLoading && <EditProfileSkeleton />}
      {loadError && (
        <p className="px-6 mt-6 font-body text-[14px] text-red-400">{loadError}</p>
      )}

      {!isLoading && !loadError && (
        <div className="px-6 py-6 max-w-[480px] mx-auto">
          {/* Photos */}
          <p className="font-body text-label uppercase font-bold text-cirkle-text-muted">Photos</p>
          <div className="mt-3">
            <PhotoGrid initialPhotos={initialPhotos} onChange={setPhotos} max={MAX_PHOTOS} />
          </div>
          {!photosValid && !anyUploading && (
            <p className="mt-2 font-body text-[13px] text-red-400">Add at least {MIN_PHOTOS} photos.</p>
          )}
          {anyUploading && (
            <p className="mt-2 font-body text-[13px] text-cirkle-text-muted">Uploading…</p>
          )}

          {/* Name */}
          <div className="mt-7 flex flex-col gap-4">
            <div>
              <label htmlFor="firstName" className="font-body text-[13px] font-semibold text-cirkle-text-light">First name</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input-dark mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="font-body text-[13px] font-semibold text-cirkle-text-light">Last name</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input-dark mt-1.5"
              />
            </div>
          </div>

          {/* Phone (locked) */}
          <div className="mt-4">
            <label className="font-body text-[13px] font-semibold text-cirkle-text-light">Phone number</label>
            <div className="mt-1.5 flex items-center justify-between px-4 py-3 rounded-[10px] bg-cirkle-input border border-cirkle-border-card">
              <span className="font-body text-[14px] text-cirkle-text-muted">{MOCK_PHONE}</span>
              <Lock size={16} className="text-cirkle-text-muted" strokeWidth={2} />
            </div>
            <p className="mt-1.5 font-body text-[12px] text-cirkle-text-muted">Phone number used to sign in</p>
          </div>

          {/* Bio */}
          <div className="mt-4">
            <label htmlFor="bio" className="font-body text-[13px] font-semibold text-cirkle-text-light">About you</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
              rows={4}
              placeholder="Tell people a bit about yourself…"
              className="input-dark mt-1.5 resize-none"
            />
            <p className="mt-1 text-right font-body text-[12px] text-cirkle-text-muted">{bio.length}/{BIO_MAX}</p>
          </div>

          {/* My vibe (tags) */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <label className="font-body text-[13px] font-semibold text-cirkle-text-light">My vibe</label>
              <span className={`font-body text-[13px] font-bold ${tagsValid ? 'text-cirkle-yellow' : 'text-red-400'}`}>
                {tagCount}/{MAX_TAGS}
              </span>
            </div>
            {categories.map((category) => (
              <div key={category.name} className="mt-4">
                <p className="font-body text-label uppercase font-bold text-cirkle-text-muted">{category.name}</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {category.items.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id)
                    const isDisabled = !isSelected && tagCount >= MAX_TAGS
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
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
            {!tagsValid && (
              <p className="mt-3 font-body text-[13px] text-red-400">Pick at least {MIN_TAGS} tags.</p>
            )}
          </div>

          {apiError && (
            <p className="mt-6 font-body text-[13px] text-red-400">{apiError}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default EditProfile
