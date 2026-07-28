import { useEffect, useRef, useState } from 'react'
import { Plus, X, Loader2, RotateCcw } from 'lucide-react'
import { uploadProfilePhoto } from '../lib/uploads.js'
import { decodeForCrop } from '../lib/crop.js'
import PhotoCropper from './PhotoCropper.jsx'

// Each slot: { uid, key, previewUrl, status: 'uploading'|'done'|'error',
//             progress, error, file, isObjectUrl }
export function PhotoGrid({ initialPhotos = [], onChange, max = 4 }) {
  const [photos, setPhotos] = useState(() => initialPhotos)
  const [cropQueue, setCropQueue] = useState([]) // raw files waiting to be cropped
  const [cropSrc, setCropSrc] = useState(null) // object URL of the current crop source
  const [preparing, setPreparing] = useState(false)
  const [gridError, setGridError] = useState('')
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

  // Prepare the next queued file for cropping (HEIC decode happens here).
  // Guarded by a ref — not by `preparing` state — so flipping the state doesn't
  // re-run the effect and orphan the in-flight decode.
  const preparingRef = useRef(false)
  useEffect(() => {
    if (cropSrc || preparingRef.current || cropQueue.length === 0) return
    preparingRef.current = true
    setPreparing(true)
    setGridError('')
    decodeForCrop(cropQueue[0])
      .then((blob) => setCropSrc(URL.createObjectURL(blob)))
      .catch((err) => {
        setGridError(err.message || 'Could not read this image.')
        setCropQueue((q) => q.slice(1)) // skip the bad file
      })
      .finally(() => {
        preparingRef.current = false
        setPreparing(false)
      })
  }, [cropQueue, cropSrc])

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
    const room = max - photos.length
    if (room > 0) setCropQueue(files.slice(0, room))
  }

  const advanceQueue = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    setCropQueue((q) => q.slice(1))
  }

  const handleCropConfirm = (croppedFile) => {
    const uid = crypto.randomUUID()
    setPhotos((prev) => [
      ...prev,
      { uid, key: null, previewUrl: null, status: 'uploading', progress: 0, file: croppedFile, isObjectUrl: false },
    ])
    setTimeout(() => runUpload(uid, croppedFile), 0)
    advanceQueue()
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
                className="relative aspect-[4/5] rounded-xl overflow-hidden border border-cirkle-border-card bg-gradient-to-br from-cirkle-chip to-cirkle-border-card"
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
              className={`aspect-[4/5] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
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

      {gridError && <p className="mt-2 font-body text-[13px] text-red-400">{gridError}</p>}

      {/* Preparing a HEIC file for the crop tool */}
      {preparing && !cropSrc && (
        <div className="fixed inset-0 z-[60] bg-cirkle-black/90 flex flex-col items-center justify-center gap-3">
          <Loader2 size={26} className="text-cirkle-yellow animate-spin" strokeWidth={2} />
          <span className="font-body text-[14px] text-cirkle-text-muted">Preparing photo…</span>
        </div>
      )}

      {/* The crop tool */}
      {cropSrc && (
        <PhotoCropper imageSrc={cropSrc} onConfirm={handleCropConfirm} onCancel={advanceQueue} />
      )}
    </>
  )
}

export default PhotoGrid
