type CompressImageOptions = {
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

/**
 * Compress image client-side before upload.
 * Keeps the original file when compression fails or does not shrink size.
 */
export const compressImageFile = async (
  file: File,
  options: CompressImageOptions = {}
): Promise<File> => {
  if (!file.type.startsWith('image/')) return file
  // Animated / special formats: skip
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file

  const maxWidth = options.maxWidth ?? 1920
  const maxHeight = options.maxHeight ?? 1920
  const quality = options.quality ?? 0.82

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height)
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      bitmap.close()
      return file
    }

    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality)
    })

    if (!blob || blob.size >= file.size) return file

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image'
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } catch {
    return file
  }
}
