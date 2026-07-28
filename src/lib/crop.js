// Crop pipeline helpers. The crop step is the universal normalizer: any picked
// file → (HEIC decode if needed) → 4:5 crop → WebP export → existing upload.

const CROPPABLE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function isHeic(file) {
  const type = (file.type || '').toLowerCase()
  const name = (file.name || '').toLowerCase()
  // Explicit HEIC MIME → definitely HEIC.
  if (type === 'image/heic' || type === 'image/heif') return true
  // A known-good image MIME → trust it, even if the filename still says .heic.
  // (Browsers/OS often transcode HEIC→JPEG on selection but keep the name.)
  if (CROPPABLE_TYPES.includes(type)) return false
  // Unknown / empty MIME → fall back to the extension.
  return name.endsWith('.heic') || name.endsWith('.heif')
}

// Browsers can't draw HEIC to a canvas, so decode it to JPEG *before* cropping.
// JPEG/PNG/WebP pass through untouched. Returns a canvas-drawable Blob/File.
export async function decodeForCrop(file) {
  // Diagnostic — shows exactly which path a file takes. Safe to remove later.
  console.info('[crop] picked file', { type: file.type, name: file.name, size: file.size, heic: isHeic(file) })

  if (isHeic(file)) {
    const { default: heic2any } = await import('heic2any')
    console.time('[crop] heic2any decode')
    try {
      const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
      return Array.isArray(out) ? out[0] : out
    } finally {
      console.timeEnd('[crop] heic2any decode')
    }
  }
  if (!CROPPABLE_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are allowed.')
  }
  return file
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read this image.'))
    img.src = src
  })
}

// Render the chosen crop region to a canvas and export a WebP File, capped to
// `maxLong` on the long edge (no upscaling), ~0.8 quality.
export async function getCroppedWebp(imageSrc, cropPixels, { maxLong = 1080, quality = 0.8 } = {}) {
  console.time('[crop] webp export')
  try {
    return await exportWebp(imageSrc, cropPixels, maxLong, quality)
  } finally {
    console.timeEnd('[crop] webp export')
  }
}

async function exportWebp(imageSrc, cropPixels, maxLong, quality) {
  const image = await loadImage(imageSrc)
  const { x, y, width, height } = cropPixels

  const longEdge = Math.max(width, height)
  const scale = longEdge > maxLong ? maxLong / longEdge : 1
  const outW = Math.round(width * scale)
  const outH = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, x, y, width, height, 0, 0, outW, outH)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
  if (!blob) throw new Error('Could not process this image.')
  return new File([blob], `photo-${Date.now()}.webp`, { type: 'image/webp' })
}
