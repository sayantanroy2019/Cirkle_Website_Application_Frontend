import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'
import { getCroppedWebp } from '../lib/crop.js'

// Full-screen crop tool locked to 4:5 portrait. Pan/zoom the image behind a
// fixed frame; Confirm exports a 4:5 WebP, Cancel discards.
export function PhotoCropper({ imageSrc, onConfirm, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')

  const onCropComplete = useCallback((_area, pixels) => setCroppedAreaPixels(pixels), [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels || isExporting) return
    setIsExporting(true)
    setError('')
    try {
      const file = await getCroppedWebp(imageSrc, croppedAreaPixels)
      onConfirm(file)
    } catch (err) {
      setError(err.message || 'Could not process this image.')
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-cirkle-black flex flex-col">
      <div className="h-14 flex items-center justify-center border-b border-cirkle-border">
        <h2 className="font-body text-[16px] font-semibold text-white">Position your photo</h2>
      </div>

      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={4 / 5}
          minZoom={1}
          maxZoom={4}
          restrictPosition
          objectFit="contain"
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      <div className="px-6 pt-4">
        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-cirkle-yellow"
          aria-label="Zoom"
        />
      </div>

      {error && <p className="px-6 pt-2 font-body text-[13px] text-red-400 text-center">{error}</p>}

      <div className="px-6 py-5 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isExporting}
          className="btn-secondary flex-1 py-3 disabled:opacity-40 disabled:pointer-events-none"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!croppedAreaPixels || isExporting}
          className="btn-primary flex-1 py-3 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isExporting ? 'Processing…' : 'Confirm'}
        </button>
      </div>
    </div>
  )
}

export default PhotoCropper
