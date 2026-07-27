import { useEffect, useRef, useState } from 'react'
import { Plus, X, Loader2, RotateCcw } from 'lucide-react'
import { uploadProfilePhoto } from '../lib/uploads.js'

// Each slot: { uid, key, previewUrl, status: 'uploading'|'done'|'error',
//             progress, error, file, isObjectUrl }
export function PhotoGrid({ initialPhotos = [], onChange, max = 4 }) {
  const [photos, setPhotos] = useState(() => initialPhotos)
  const fileInputRef = useRef(null)

  // Report the current slots up so the parent can validate + build the save payload.
  useEffect(() => {
    onChange?.(photos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos])

  // Revoke object URLs (new uploads only) on unmount.
  const photosRef = useRef(photos)
  photosRef.current = photos
  useEffect(
    () => () =>
      photosRef.current.forEach((p) => p.isObjectUrl && p.previewUrl && URL.revokeObjectURL(p.previewUrl)),
    [],
  )

  const patch = (uid, fields) =>
    setPhotos((prev) => prev.map((p) => (p.uid === uid ? { ...p, ...fields } : p)))

  const runUpload = async (uid, file) => {
    patch(uid, { status: 'uploading', progress: 0, error: '' })
    try {
      const { key, previewUrl } = await uploadProfilePhoto(file, {
        onProgress: (progress) => patch(uid, { progress }),
      })
      patch(uid, { key, previewUrl, status: 'done', isObjectUrl: true })
    } catch (err) {
      patch(uid, { status: 'error', error: err.message || 'Upload failed' })
    }
  }

  const handleFiles = (e) => {
    const files = Array.from(e.target.files)
    e.target.value = ''
    setPhotos((prev) => {
      const room = max - prev.length
      const additions = files.slice(0, room).map((file) => ({
        uid: crypto.randomUUID(),
        key: null,
        previewUrl: null,
        status: 'uploading',
        progress: 0,
        file,
        isObjectUrl: false,
      }))
      // Kick off each upload after state commits.
      additions.forEach((a) => setTimeout(() => runUpload(a.uid, a.file), 0))
      return [...prev, ...additions]
    })
  }

  const removePhoto = (uid) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.uid === uid)
      if (target?.isObjectUrl && target.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((p) => p.uid !== uid)
    })
  }

  const slots = Array.from({ length: max }, (_, i) => photos[i] ?? null)
  const firstEmpty = photos.length

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        onChange={handleFiles}
        className="hidden"
      />
      <div className="grid grid-cols-2 gap-3">
        {slots.map((photo, i) => {
          if (photo) {
            return (
              <div
                key={photo.uid}
                className="relative aspect-square rounded-xl overflow-hidden border border-cirkle-border-card bg-gradient-to-br from-cirkle-chip to-cirkle-border-card"
              >
                {photo.previewUrl && photo.status === 'done' && (
                  <img src={photo.previewUrl} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                )}

                {photo.status === 'uploading' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50">
                    <Loader2 size={22} className="text-white animate-spin" strokeWidth={2} />
                    <span className="font-body text-[12px] font-semibold text-white">{photo.progress}%</span>
                  </div>
                )}

                {photo.status === 'error' && (
                  <button
                    type="button"
                    onClick={() => runUpload(photo.uid, photo.file)}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/70"
                  >
                    <RotateCcw size={20} className="text-cirkle-yellow" strokeWidth={2} />
                    <span className="font-body text-[12px] font-semibold text-cirkle-yellow">Retry</span>
                    <span className="font-body text-[10px] text-red-400 px-2 text-center">{photo.error}</span>
                  </button>
                )}

                {i === 0 && photo.status === 'done' && (
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
    </>
  )
}

export default PhotoGrid
