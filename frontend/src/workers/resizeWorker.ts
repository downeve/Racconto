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

    // quality 는 리사이즈 여부(크기) 기준 — 파일 형식 기준 아님.
    // 장변 > 3200 → 다운스케일되어 재샘플링되므로 0.88 (용량 절약)
    // 장변 ≤ 3200 → 원본 크기 유지, 이중 압축 손실 최소화 위해 0.92
    const willResize = Math.max(width, height) > MAX_SIZE
    const quality = willResize ? 0.88 : 0.92
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
    self.postMessage({ blob })
  } catch (err) {
    self.postMessage({ error: String(err) })
  }
})
