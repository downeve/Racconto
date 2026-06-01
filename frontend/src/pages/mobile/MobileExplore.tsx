import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import axios from 'axios'
import PublicNavbar from '../../components/PublicNavbar'
import PortfolioListCard from '../../components/PortfolioListCard'
import PortfolioListBanner from '../../components/PortfolioListBanner'
import { useDebounce } from '../../hooks/useDebounce'
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

interface SearchUser {
  username: string
  cover_image_url: string | null
  latest_slug: string | null
}

interface SearchResponse {
  users: SearchUser[]
  portfolios: ExploreItem[]
}

export default function MobileExplore() {
  const { t } = useTranslation()
  const [cameraFilter, setCameraFilter] = useState<CameraType | ''>('')
  const [tagFilter, setTagFilter] = useState<string>('')
  const sentinelRef = useRef<HTMLDivElement>(null)

  const [searchInput, setSearchInput] = useState('')
  const searchQuery = useDebounce(searchInput.trim(), 300)
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const isSearching = searchQuery.length >= 2

  // 피드를 React Query 캐시에 보관 — 상세 다녀온 뒤 재진입 시 누적 페이지가 즉시
  // 복원되어 목록 재생성/커버 빈칸 깜빡임이 사라진다(이미지도 캐시에서 즉시 페인트).
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['exploreFeed', cameraFilter, tagFilter],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      if (pageParam) params.set('cursor', pageParam as string)
      if (cameraFilter) params.set('camera_type', cameraFilter)
      if (tagFilter) params.set('tag', tagFilter)
      const { data } = await axios.get<FeedResponse>(`${API}/explore/feed?${params.toString()}`)
      return data
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.next_cursor : undefined),
    staleTime: 1000 * 60 * 5,
  })
  const items = useMemo<ExploreItem[]>(() => data?.pages.flatMap(p => p.items) ?? [], [data])
  const loading = isLoading || isFetchingNextPage

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasNextPage || isSearching) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    }, { rootMargin: '400px' })
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [hasNextPage, isFetchingNextPage, isSearching, fetchNextPage])

  useEffect(() => {
    if (!isSearching) {
      setSearchResults(null)
      return
    }
    let cancelled = false
    setSearchLoading(true)
    axios.get<SearchResponse>(`${API}/explore/search`, { params: { q: searchQuery } })
      .then(({ data }) => { if (!cancelled) setSearchResults(data) })
      .catch(() => { if (!cancelled) setSearchResults({ users: [], portfolios: [] }) })
      .finally(() => { if (!cancelled) setSearchLoading(false) })
    return () => { cancelled = true }
  }, [searchQuery, isSearching])

  // 카메라 칩 라벨은 모든 언어에서 동일 영문 대문자 — FILM / DIGITAL / MOBILE / MIXED
  const cameraLabel = (ct: typeof CAMERA_TYPES[number]) => ct.value.toUpperCase()

  const cardHref = (item: ExploreItem) =>
    item.author.username && item.slug
      ? `/${item.author.username}/${item.slug}`
      : `/${item.author.username ?? ''}`

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* 모바일은 자체 Navbar 없음 — 인증 여부와 무관하게 PublicNavbar 로 메인 이동 경로 제공 */}
      <PublicNavbar compactLogo />
      <main className="px-5 pb-16 pt-20">
        <PortfolioListBanner
          eyebrow={t('explore.eyebrow', 'Discover')}
          title={t('explore.title', 'Photographers')}
          largerEyebrow
        />

        {/* 검색바 */}
        <div className="mb-6 relative">
          <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={t('explore.searchPlaceholder', 'Search photographers or portfolios…')}
            className="w-full pl-9 pr-9 py-2.5 text-[0.9375rem] bg-canvas-2 border border-hair rounded-btn focus:border-ink focus:outline-none transition-colors placeholder:text-faint"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label={t('common.close')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-ink p-1"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* 활성 태그 필터 표시 */}
        {!isSearching && tagFilter && (
          <div className="mb-4 flex items-center gap-2">
            <span className="t-caption text-muted">{t('explore.filteredBy', 'Filtered by')}</span>
            <button
              type="button"
              onClick={() => setTagFilter('')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 t-caption rounded-btn bg-ink text-canvas border border-ink"
            >
              #{tagFilter}
              <X size={12} strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* 칩 필터 — 가로 스크롤 */}
        {!isSearching && (
          <div className="mb-8 -mx-5 px-5 flex items-center gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
            <button
              type="button"
              onClick={() => setCameraFilter('')}
              className={`shrink-0 px-3 py-1.5 t-caption rounded-btn border transition-colors ${
                cameraFilter === ''
                  ? 'bg-ink text-canvas border-ink'
                  : 'border-hair text-muted'
              }`}
            >
              {t('common.all')}
            </button>
            {CAMERA_TYPES.map(ct => (
              <button
                key={ct.value}
                type="button"
                onClick={() => setCameraFilter(ct.value)}
                className={`shrink-0 px-3 py-1.5 t-caption rounded-btn border transition-colors ${
                  cameraFilter === ct.value
                    ? 'bg-ink text-canvas border-ink'
                    : 'border-hair text-muted'
                }`}
              >
                {cameraLabel(ct)}
              </button>
            ))}
          </div>
        )}

        {/* 검색 결과 */}
        {isSearching && searchResults && (
          <div className="space-y-10">
            {searchLoading && (
              <p className="t-caption text-faint">{t('common.loading')}</p>
            )}
            {!searchLoading && searchResults.users.length === 0 && searchResults.portfolios.length === 0 && (
              <p className="font-serif text-h3 text-muted py-10">
                {t('explore.searchEmpty', 'No results found')}
              </p>
            )}
            {searchResults.users.length > 0 && (
              <section>
                <p className="t-eyebrow text-faint mb-3">{t('explore.searchUsers', 'Photographers')}</p>
                <div className="grid grid-cols-3 gap-x-3 gap-y-6">
                  {searchResults.users.map(u => (
                    <Link key={u.username} to={`/${u.username}`} state={{ from: '/explore' }} className="block">
                      <div className="aspect-square overflow-hidden bg-placeholder">
                        {u.cover_image_url && (
                          <img
                            src={cfUrl(u.cover_image_url, 'grid')}
                            srcSet={`${cfUrl(u.cover_image_url, 'mobile')} 480w, ${cfUrl(u.cover_image_url, 'grid')} 800w`}
                            sizes="33vw"
                            alt={u.username}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <p className="t-caption mt-2 text-ink truncate">@{u.username}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {searchResults.portfolios.length > 0 && (
              <section>
                <p className="t-eyebrow text-faint mb-3">{t('explore.searchPortfolios', 'Portfolios')}</p>
                <div className="space-y-12">
                  {searchResults.portfolios.map(item => (
                    <PortfolioListCard
                      key={item.id}
                      mode="explore"
                      href={cardHref(item)}
                      linkState={{ from: '/explore' }}
                      coverImageUrl={item.cover_image_url}
                      title={item.title}
                      author={item.author.username ?? undefined}
                      cameraType={item.camera_type}
                      tags={item.tags}
                      onTagClick={(tag) => { setSearchInput(''); setTagFilter(tag) }}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {!isSearching && items.length === 0 && !loading && (
          <div className="py-20">
            <p className="font-serif text-h3 text-muted">
              {t('explore.empty', 'No portfolios yet. Be the first to share your story.')}
            </p>
          </div>
        )}

        {!isSearching && items.length > 0 && (
          <div className="space-y-12">
            {items.map(item => (
              <PortfolioListCard
                key={item.id}
                mode="explore"
                href={cardHref(item)}
                linkState={{ from: '/explore' }}
                coverImageUrl={item.cover_image_url}
                title={item.title}
                author={item.author.username ?? undefined}
                cameraType={item.camera_type}
                tags={item.tags}
                onTagClick={setTagFilter}
              />
            ))}
          </div>
        )}

        {!isSearching && loading && (
          <div className="space-y-12 mt-10">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[3/2] bg-placeholder animate-pulse" />
                <div className="mt-3 h-3 w-20 bg-placeholder animate-pulse" />
                <div className="mt-2 h-4 w-3/4 bg-placeholder animate-pulse" />
              </div>
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-1" />
      </main>
    </div>
  )
}
