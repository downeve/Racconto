import { useVideoAutoplay } from '../hooks/useVideoAutoplay'

interface Props {
  src: string           // 확장자 제외 base 경로 (예: ./screenshots/screenshot-story_en)
  poster: string        // 포스터 webp 경로
  className?: string
}

/**
 * preload="none" + IntersectionObserver autoplay 비디오.
 * 페이지 첫 로드 시 비디오 자체는 다운로드하지 않고 poster만 로드.
 * 뷰포트 진입 시 재생 시작.
 */
export default function LazyAutoplayVideo({ src, poster, className = '' }: Props) {
  const videoRef = useVideoAutoplay()

  return (
    <video
      ref={videoRef}
      loop
      muted
      playsInline
      preload="none"
      poster={poster}
      className={className}
    >
      <source src={`${src}.webm`} type="video/webm" />
      <source src={`${src}.mp4`} type="video/mp4" />
    </video>
  )
}
