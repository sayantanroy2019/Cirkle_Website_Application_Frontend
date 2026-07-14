import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, Lock } from 'lucide-react'
import { api, ApiError } from '../lib/api.js'
import { getLifestyleTags } from '../lib/reference.js'
import { useProfileStore } from '../store/profileStore.js'

const MIN_NAME = 2
const MIN_PHOTOS = 2
const MAX_PHOTOS = 4
const MIN_TAGS = 3
const MAX_TAGS = 5
const BIO_MAX = 300

// Phone isn't exposed by the API yet — mock value for the locked row.
const MOCK_PHONE = '+91 98765 43210'

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
  // photos: { uid, s3Key|null, url|null } — existing have s3Key, new have a preview url
  const [photos, setPhotos] = useState([])
  const [selectedTagIds, setSelectedTagIds] = useState([])

  const [isSaving, setIsSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const fileInputRef = useRef(null)

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
    setPhotos(
      [...profile.photos]
        .sort((a, b) => a.position - b.position)
        .map((ph) => ({ uid: ph.id, s3Key: ph.s3Key, url: null })),
    )
    setSelectedTagIds(profile.lifestyleTags.map((t) => t.id))
    setSeeded(true)
  }, [profile, seeded])

  const isLoading = !seeded && !profileError
  const loadError = profileError || tagsError

  // Revoke preview URLs on unmount.
  const photosRef = useRef(photos)
  photosRef.current = photos
  useEffect(
    () => () => photosRef.current.forEach((p) => p.url && URL.revokeObjectURL(p.url)),
    [],
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

  const handleFiles = (e) => {
    const files = Array.from(e.target.files)
    setPhotos((prev) => {
      const room = MAX_PHOTOS - prev.length
      const additions = files.slice(0, room).map((file) => ({
        uid: crypto.randomUUID(),
        s3Key: null,
        url: URL.createObjectURL(file),
      }))
      return [...prev, ...additions]
    })
    e.target.value = ''
  }

  const removePhoto = (uid) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.uid === uid)
      if (target?.url) URL.revokeObjectURL(target.url)
      return prev.filter((p) => p.uid !== uid)
    })
  }

  const toggleTag = (id) => {
    setSelectedTagIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_TAGS) return prev
      return [...prev, id]
    })
  }

  const tagCount = selectedTagIds.length
  const nameValid = firstName.trim().length >= MIN_NAME && lastName.trim().length >= MIN_NAME
  const photosValid = photos.length >= MIN_PHOTOS
  const tagsValid = tagCount >= MIN_TAGS && tagCount <= MAX_TAGS
  const canSave = nameValid && photosValid && tagsValid && !isSaving

  const handleSave = async () => {
    if (!canSave) return
    setIsSaving(true)
    setApiError('')
    // New photos have no real S3 key yet — synthesize (upload flow is stubbed).
    const payloadPhotos = photos.map((p, i) => ({
      s3Key: p.s3Key ?? `profiles/local/photo-${i}.jpg`,
      position: i,
    }))
    try {
      await api.patch('/profile/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
        lifestyleTagIds: selectedTagIds,
        photos: payloadPhotos,
      })
      // Update the shared profile in place (PATCH returns no body) so Profile
      // shows the new values instantly without a refetch.
      applyProfileUpdate({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
        lifestyleTags: selectedTagIds
          .map((id) => allTags.find((t) => t.id === id))
          .filter(Boolean),
        photos: payloadPhotos,
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

      {isLoading && (
        <p className="px-6 mt-6 font-body text-[14px] text-cirkle-text-muted">Loading…</p>
      )}
      {loadError && (
        <p className="px-6 mt-6 font-body text-[14px] text-red-400">{loadError}</p>
      )}

      {!isLoading && !loadError && (
        <div className="px-6 py-6 max-w-[480px] mx-auto">
          {/* Photos */}
          <p className="font-body text-label uppercase font-bold text-cirkle-text-muted">Photos</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            className="hidden"
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            {slots.map((photo, i) => {
              if (photo) {
                return (
                  <div key={photo.uid} className="relative aspect-square rounded-xl overflow-hidden border border-cirkle-border-card bg-gradient-to-br from-cirkle-chip to-cirkle-border-card">
                    {photo.url && (
                      <img src={photo.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    )}
                    {i === 0 && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-cirkle-yellow text-cirkle-text-dark font-body text-[11px] font-bold">
                        Main
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.uid)}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white transition-all duration-200 hover:bg-black/80"
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                )
              }
              const isAddSlot = i === firstEmpty
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
          {!photosValid && (
            <p className="mt-2 font-body text-[13px] text-red-400">Add at least {MIN_PHOTOS} photos.</p>
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
