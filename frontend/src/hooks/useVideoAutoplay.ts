import { useEffect, useRef } from 'react'

/**
 * 비디오가 뷰포트 25% 이상 보일 때만 자동 재생.
 * preload="none"과 함께 사용해 초기 페이로드를 줄이는 용도.
 */
export function useVideoAutoplay() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.25 }
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return videoRef
}
