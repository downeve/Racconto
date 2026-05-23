/**
 * File 객체의 원본 이미지 차원(width/height)을 측정.
 * 업로드 시 backend 에 전달해 portfolio 렌더에서 CLS 제거 + 첫 페인트 정확한 카드 높이 확보 용도.
 * 실패 시 null 반환 — 호출자가 폴백으로 처리.
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      } else {
        resolve(null)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}
