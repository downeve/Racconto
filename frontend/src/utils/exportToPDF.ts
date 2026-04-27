import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// A4 여백 설정 (mm)
const MARGIN = { top: 15, bottom: 15, left: 12, right: 12 }

export async function exportToPDF(
  containerId: string,   // 캡처 전체 영역 — 이미지 경계 계산용
  startId: string,       // 실제 출력 시작 요소
  filename: string,
  darkMode: boolean,
  onProgress?: (step: string) => void
): Promise<void> {
  const container = document.getElementById(containerId)
  const startEl   = document.getElementById(startId)
  if (!container) throw new Error(`#${containerId} not found`)
  if (!startEl)   throw new Error(`#${startId} not found`)

  // ── 1. 이미지 로딩 대기 ───────────────────────────────────
  onProgress?.('이미지 로딩 중...')
  await Promise.all(
    Array.from(container.querySelectorAll('img')).map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>(resolve => {
            img.onload = () => resolve()
            img.onerror = () => resolve()
          })
    )
  )

  // ── 2. 캔버스 캡처 (startEl 기준) ────────────────────────
  //   startEl의 top ~ container의 bottom 만큼만 캡처
  onProgress?.('레이아웃 캡처 중...')

  const containerRect = container.getBoundingClientRect()
  const startRect     = startEl.getBoundingClientRect()

  // startEl이 container 안에서 몇 px 아래에 있는지
  const yOffset = startRect.top - containerRect.top

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: darkMode ? '#18140F' : '#FAF8F5',
    logging: false,
    imageTimeout: 15000,
    // 캡처 시작 y를 startEl 위치로 지정
    y: yOffset,
    height: container.offsetHeight - yOffset,
    windowHeight: container.offsetHeight,
  })

  // ── 3. PDF 설정 ───────────────────────────────────────────
  onProgress?.('PDF 생성 중...')

  const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  const pageW  = pdf.internal.pageSize.getWidth()   // 210mm
  const pageH  = pdf.internal.pageSize.getHeight()  // 297mm

  // 여백을 제외한 실제 콘텐츠 영역 (mm)
  const contentW = pageW - MARGIN.left - MARGIN.right
  const contentH = pageH - MARGIN.top  - MARGIN.bottom

  // 콘텐츠 영역에 맞춘 canvas px 단위 페이지 높이
  const scale        = canvas.width / contentW       // canvas px per mm
  const pageCanvasH  = Math.round(contentH * scale)

  // ── 4. 이미지 경계 수집 (스마트 슬라이싱용) ───────────────
  const canvasScale  = canvas.height / (container.offsetHeight - yOffset)

  const imgBoundaries = new Set<number>()
  container.querySelectorAll('img').forEach(img => {
    const r   = img.getBoundingClientRect()
    const top    = (r.top    - startRect.top) * canvasScale
    const bottom = (r.bottom - startRect.top) * canvasScale
    if (bottom > 0) {  // startEl 위에 있는 이미지는 제외
      imgBoundaries.add(Math.round(top))
      imgBoundaries.add(Math.round(bottom))
    }
  })

  const boundaries = Array.from(imgBoundaries).sort((a, b) => a - b)

  function smartCut(idealCut: number): number {
    const tolerance = pageCanvasH * 0.25
    for (const b of boundaries) {
      if (b > idealCut - tolerance && b < idealCut) return b
    }
    return idealCut
  }

  // ── 5. 슬라이스 목록 생성 ─────────────────────────────────
  const slices: Array<{ y: number; h: number }> = []
  let yStart = 0

  while (yStart < canvas.height) {
    const idealEnd = yStart + pageCanvasH
    const yEnd     = idealEnd >= canvas.height
      ? canvas.height
      : smartCut(idealEnd)

    slices.push({ y: yStart, h: yEnd - yStart })
    yStart = yEnd
  }

  // ── 6. 슬라이스 → PDF 페이지 ─────────────────────────────
  slices.forEach(({ y, h }, i) => {
    const sliceCanvas = document.createElement('canvas')
    sliceCanvas.width  = canvas.width
    sliceCanvas.height = h
    const ctx = sliceCanvas.getContext('2d')!

    // 배경색 채우기 (여백 영역이 투명하게 뚫리지 않도록)
    ctx.fillStyle = darkMode ? '#18140F' : '#FAF8F5'
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)

    const imgData   = sliceCanvas.toDataURL('image/jpeg', 0.92)
    const sliceHmm  = h / scale  // canvas px → mm

    if (i > 0) pdf.addPage()

    // MARGIN.left, MARGIN.top 으로 offset — 여백 생성
    pdf.addImage(imgData, 'JPEG', MARGIN.left, MARGIN.top, contentW, sliceHmm)
  })

  // ── 7. 저장 ───────────────────────────────────────────────
  onProgress?.('저장 중...')
  pdf.save(`${filename}.pdf`)
}