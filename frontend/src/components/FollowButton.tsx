import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

interface Props {
  username: string
}

interface StatusResponse {
  following: boolean
  is_self?: boolean
}

/**
 * 작가 팔로우 버튼.
 * - 비로그인 또는 본인 페이지에서는 호출자가 마운트하지 않도록 한다 (PublicPortfolio 에서 분기).
 * - idempotent POST/DELETE 로 토글.
 * - 색은 의미 토큰만(상위 [data-theme] 스코프가 자동 라이트/다크 매핑).
 */
export default function FollowButton({ username }: Props) {
  const { t } = useTranslation()
  const [following, setFollowing] = useState<boolean | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    axios.get<StatusResponse>(`${API}/follows/status/${username}`)
      .then(({ data }) => { if (!cancelled) setFollowing(!!data.following) })
      .catch(() => { if (!cancelled) setFollowing(false) })
    return () => { cancelled = true }
  }, [username])

  if (following === null) return null  // 상태 모르는 동안은 표시 안 함

  const toggle = async () => {
    if (pending) return
    setPending(true)
    const next = !following
    setFollowing(next)  // 낙관적 업데이트
    try {
      if (next) {
        await axios.post(`${API}/follows/${username}`)
      } else {
        await axios.delete(`${API}/follows/${username}`)
      }
    } catch {
      setFollowing(!next)  // 실패 시 롤백
    } finally {
      setPending(false)
    }
  }

  // following=true → passive(이미 팔로우 중). following=false → active CTA.
  const passive = 'border-hair text-muted hover:text-ink'
  const active = 'border-ink bg-ink text-canvas hover:bg-ink/85'

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`inline-flex items-center px-3 py-1 t-caption rounded-btn border transition-colors duration-150 disabled:opacity-50 ${
        following ? passive : active
      }`}
    >
      {following
        ? t('follow.following', 'Following')
        : t('follow.follow', 'Follow')}
    </button>
  )
}
