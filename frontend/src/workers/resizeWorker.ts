const MAX_SIZE = 3200

self.addEventListener('message', async (e: MessageEvent<{ file: File }>) => {
  const { file } = e.data
  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap

    let newW = width, newH = height
    if (Math.max(width, height) > MAX_SIZE) {
      if (width >= height) {
        newW = MAX_SIZE
        newH = Math.round(height * MAX_SIZE / width)
      } else {
        newH = MAX_SIZE
        newW = Math.round(width * MAX_SIZE / height)
      }
    }

    const canvas = new OffscreenCanvas(newW, newH)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, newW, newH)
    bitmap.close()

    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.88 })
    self.postMessage({ blob })
  } catch (err) {
    self.postMessage({ error: String(err) })
  }
})
