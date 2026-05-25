import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import PublicNavbar from '../../components/PublicNavbar'
import { useAuth } from '../../context/AuthContext'
import { CAMERA_TYPES, type CameraType } from '../../constants/tags'
import { cfUrl } from '../../utils/cfImage'

const API = import.meta.env.VITE_API_URL

interface ExploreItem {
  id: string
  title: string
  slug: string | null
  cover_image_url: string | null
  camera_type: CameraType | null
  tags: string[]
  photo_count: number
  updated_at: string | null
  published_at: string | null
  author: { username: string | null }
}

interface FeedResponse {
  items: ExploreItem[]
  next_cursor: string | null
  has_more: boolean
}

export default function MobileExplore() {
  const { t, i18n } = useTranslation()
  const { isAuthenticated } = useAuth()
  const lang = i18n.language.startsWith('ko') ? 'ko' : i18n.language.startsWith('ja') ? 'ja' : 'en'
  const [items, setItems] = useState<ExploreItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [cameraFilter, setCameraFilter] = useState<CameraType | ''>('')
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setItems([])
    setCursor(null)
    setHasMore(true)
  }, [cameraFilter])

  const fetchPage = useCallback(async (currentCursor: string | null, filter: CameraType | '') => {
    if (loading) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (currentCursor) params.set('cursor', currentCursor)
      if (filter) params.set('camera_type', filter)
      const { data } = await axios.get<FeedResponse>(`${API}/explore/feed?${params.toString()}`)
      setItems(prev => currentCursor ? [...prev, ...data.items] : data.items)
      setCursor(data.next_cursor)
      setHasMore(data.has_more)
    } catch {}
    finally { setLoading(false) }
  }, [loading])

  useEffect(() => {
    fetchPage(null, cameraFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraFilter])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading && hasMore && cursor) {
        fetchPage(cursor, cameraFilter)
      }
    }, { rootMargin: '400px' })
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [cursor, hasMore, loading, cameraFilter, fetchPage])

  const cameraLabel = (ct: typeof CAMERA_TYPES[number]) =>
    lang === 'ko' ? ct.labelKo : lang === 'ja' ? ct.labelJa : ct.label

  return (
    <div className="min-h-screen bg-edit-canvas text-edit-ink">
      {/* 인증된 사용자에게는 App.tsx 의 Navbar 가 이미 렌더되므로 겹침 방지 */}
      {!isAuthenticated && <PublicNavbar compactLogo />}
      <main className={`px-5 pb-16 ${isAuthenticated ? 'pt-6' : 'pt-20'}`}>
        <header className="mb-8 text-center">
          <p className="t-eyebrow text-edit-muted mb-2">{t('explore.eyebrow', 'Discover')}</p>
          <h1 className="font-serif text-h1 text-edit-ink font-normal tracking-tight">
            {t('explore.title', 'Explore portfolios')}
          </h1>
          <p className="font-serif text-body text-edit-muted mt-3 leading-[1.65]">
            {t('explore.subtitle', 'Photographers sharing their stories — one portfolio per artist, in chronological order.')}
          </p>
        </header>

        {/* 칩 필터 — 가로 스크롤 */}
        <div className="mb-8 -mx-5 px-5 flex items-center gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          <button
            type="button"
            onClick={() => setCameraFilter('')}
            className={`shrink-0 px-3 py-1.5 t-caption rounded-[2px] border transition-colors ${
              cameraFilter === ''
                ? 'bg-edit-ink text-edit-paper border-edit-ink'
                : 'border-edit-line text-edit-muted'
            }`}
          >
            {t('common.all')}
          </button>
          {CAMERA_TYPES.map(ct => (
            <button
              key={ct.value}
              type="button"
              onClick={() => setCameraFilter(ct.value)}
              className={`shrink-0 px-3 py-1.5 t-caption rounded-[2px] border transition-colors ${
                cameraFilter === ct.value
                  ? 'bg-edit-ink text-edit-paper border-edit-ink'
                  : 'border-edit-line text-edit-muted'
              }`}
            >
              {cameraLabel(ct)}
            </button>
          ))}
        </div>

        {items.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="font-serif text-h3 text-edit-muted">
              {t('explore.empty', 'No portfolios yet. Be the first to share your story.')}
            </p>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-10">
            {items.map(item => (
              <Link
                key={item.id}
                to={item.author.username && item.slug
                  ? `/${item.author.username}/${item.slug}`
                  : `/${item.author.username ?? ''}`
                }
                className="block"
              >
                <div className="aspect-[3/2] overflow-hidden bg-edit-paper-2">
                  {item.cover_image_url && (
                    <img
                      src={cfUrl(item.cover_image_url, 'grid')}
                      srcSet={`${cfUrl(item.cover_image_url, 'mobile')} 480w, ${cfUrl(item.cover_image_url, 'grid')} 800w`}
                      sizes="100vw"
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="mt-3">
                  <p className="t-caption text-edit-muted">@{item.author.username ?? ''}</p>
                  <h3 className="font-serif text-h3 text-edit-ink mt-1">{item.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {item.camera_type && (
                      <span className="t-caption text-edit-faint uppercase tracking-wider">
                        {item.camera_type}
                      </span>
                    )}
                    {item.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="t-caption text-edit-faint">#{tag}</span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {loading && (
          <div className="space-y-10 mt-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[3/2] bg-edit-paper-2 animate-pulse" />
                <div className="mt-3 h-3 w-20 bg-edit-paper-2 animate-pulse" />
                <div className="mt-2 h-4 w-3/4 bg-edit-paper-2 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-1" />
      </main>
    </div>
  )
}
