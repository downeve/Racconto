import { useEffect, useRef, useState } from 'react'

interface ProgressState {
  done: number
  total: number
  failed: number
  finished: boolean
}

export default function UploadToast() {
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!window.racconto) return

    window.racconto.onUploadProgress((data: { done: number; total: number; failed: number }) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setProgress({ ...data, finished: false })
    })

    window.racconto.onUploadDone((data: { total: number; success: number; failed: number }) => {
      setProgress({ done: data.total, total: data.total, failed: data.failed, finished: true })
      timerRef.current = setTimeout(() => setProgress(null), 3000)
    })
  }, [])

  if (!progress) return null

  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 bg-stone-800 text-white rounded-lg shadow-lg px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          {progress.finished
            ? progress.failed > 0
              ? `${progress.done - progress.failed}개 완료 · ${progress.failed}개 실패`
              : `${progress.total}개 업로드 완료`
            : `업로드 중 ${progress.done} / ${progress.total}개`
          }
        </span>
        {progress.finished && (
          <button
            onClick={() => setProgress(null)}
            className="opacity-60 hover:opacity-100 text-lg leading-none ml-2"
          >
            ×
          </button>
        )}
      </div>

      {/* 진행 바 */}
      <div className="w-full bg-stone-600 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${
            progress.failed > 0 && progress.finished ? 'bg-red-400' : 'bg-white'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {!progress.finished && (
        <p className="text-xs text-stone-400 mt-1.5">{percent}%</p>
      )}
    </div>
  )
}