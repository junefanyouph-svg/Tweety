const MB = 1024 * 1024
const KB = 1024

export const DEFAULT_IMAGE_UPLOAD_OPTIONS = {
  maxInputBytes: 20 * MB,
  maxDimension: 1600,
  targetBytes: 700 * KB,
  outputMimeType: 'image/jpeg',
  initialQuality: 0.82,
  minQuality: 0.45,
  minDimension: 960
}

export const AVATAR_IMAGE_UPLOAD_OPTIONS = {
  ...DEFAULT_IMAGE_UPLOAD_OPTIONS,
  maxDimension: 512,
  targetBytes: 150 * KB,
  minDimension: 256
}

export function isCompressibleImage(file) {
  if (!file?.type) return false
  if (!file.type.startsWith('image/')) return false
  return file.type !== 'image/gif'
}

export function getImageDimensions(source) {
  return {
    width: source.naturalWidth || source.videoWidth || source.width,
    height: source.naturalHeight || source.videoHeight || source.height
  }
}

export function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))),
      mimeType,
      quality
    )
  })
}

export function getUploadExtension(file, mimeType = file?.type) {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/gif') return 'gif'
  if (mimeType === 'image/webp') return 'webp'

  const fallbackExtension = file?.name?.split('.').pop()?.toLowerCase()
  return fallbackExtension || 'bin'
}

function createObjectUrlLoader(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Unsupported or corrupt image file'))
    }
    img.src = objectUrl
  })
}

async function loadImageSource(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file)
    } catch {
      // Fallback to Image element path below.
    }
  }

  return createObjectUrlLoader(file)
}

function closeImageSource(source) {
  if (source && typeof source.close === 'function') {
    source.close()
  }
}

function getScaledSize(width, height, maxDimension) {
  const longestEdge = Math.max(width, height)
  if (longestEdge <= maxDimension) {
    return {
      width: Math.round(width),
      height: Math.round(height)
    }
  }

  const scale = maxDimension / longestEdge
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  }
}

function drawToCanvas(source, width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) {
    throw new Error('Could not create canvas context')
  }

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(source, 0, 0, width, height)

  return canvas
}

function maybeKeepOriginal(file, compressedBlob, options) {
  return compressedBlob.size >= file.size && file.size <= options.maxInputBytes
}

function createUploadFile(blob, originalName, mimeType) {
  const safeBaseName = (originalName || 'upload')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'upload'

  return new File([blob], `${safeBaseName}.jpg`, {
    type: mimeType,
    lastModified: Date.now()
  })
}

function logCompressionStats(label, originalSize, compressedSize, width, height) {
  const savedPercent = originalSize > 0
    ? Math.max(0, Math.round((1 - (compressedSize / originalSize)) * 100))
    : 0

  console.log(`[imageUpload] ${label}: ${Math.round(originalSize / KB)}KB -> ${Math.round(compressedSize / KB)}KB (${savedPercent}% saved) at ${width}x${height}`)
}

export async function compressImageForUpload(file, options = {}) {
  const mergedOptions = { ...DEFAULT_IMAGE_UPLOAD_OPTIONS, ...options }

  if (!file) {
    throw new Error('No image file provided')
  }

  if (!file.type?.startsWith('image/')) {
    throw new Error('Only image files can be optimized')
  }

  if (file.size > mergedOptions.maxInputBytes) {
    throw new Error('Image must be under 20 MB before compression.')
  }

  if (!isCompressibleImage(file)) {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      width: null,
      height: null,
      mimeType: file.type,
      ratio: 1
    }
  }

  let source

  try {
    source = await loadImageSource(file)
    const { width: originalWidth, height: originalHeight } = getImageDimensions(source)

    if (!originalWidth || !originalHeight) {
      throw new Error('Unsupported or corrupt image file')
    }

    let currentMaxDimension = mergedOptions.maxDimension
    let bestBlob = null
    let bestWidth = originalWidth
    let bestHeight = originalHeight

    while (currentMaxDimension >= mergedOptions.minDimension) {
      const { width, height } = getScaledSize(originalWidth, originalHeight, currentMaxDimension)
      const canvas = drawToCanvas(source, width, height)
      let quality = mergedOptions.initialQuality

      while (quality >= mergedOptions.minQuality) {
        const blob = await canvasToBlob(canvas, mergedOptions.outputMimeType, quality)
        bestBlob = blob
        bestWidth = width
        bestHeight = height

        if (blob.size <= mergedOptions.targetBytes) {
          const uploadFile = maybeKeepOriginal(file, blob, mergedOptions)
            ? file
            : createUploadFile(blob, file.name, mergedOptions.outputMimeType)

          const finalSize = uploadFile.size
          logCompressionStats(file.name || 'upload', file.size, finalSize, width, height)

          return {
            file: uploadFile,
            originalSize: file.size,
            compressedSize: finalSize,
            width,
            height,
            mimeType: uploadFile.type || mergedOptions.outputMimeType,
            ratio: file.size > 0 ? finalSize / file.size : 1
          }
        }

        quality = Number((quality - 0.07).toFixed(2))
      }

      if (currentMaxDimension === mergedOptions.minDimension) break

      currentMaxDimension = Math.max(
        mergedOptions.minDimension,
        Math.floor(currentMaxDimension * 0.8)
      )
    }

    if (!bestBlob) {
      throw new Error('We couldn’t optimize that image for upload. Try a smaller image.')
    }

    if (bestBlob.size > mergedOptions.maxInputBytes) {
      throw new Error('That image is too large even after compression. Try a smaller image.')
    }

    const uploadFile = maybeKeepOriginal(file, bestBlob, mergedOptions)
      ? file
      : createUploadFile(bestBlob, file.name, mergedOptions.outputMimeType)

    logCompressionStats(file.name || 'upload', file.size, uploadFile.size, bestWidth, bestHeight)

    return {
      file: uploadFile,
      originalSize: file.size,
      compressedSize: uploadFile.size,
      width: bestWidth,
      height: bestHeight,
      mimeType: uploadFile.type || mergedOptions.outputMimeType,
      ratio: file.size > 0 ? uploadFile.size / file.size : 1
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('We couldn’t optimize that image for upload. Try a smaller image.')
  } finally {
    closeImageSource(source)
  }
}
