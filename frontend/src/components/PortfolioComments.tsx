import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { Trash2, MessageCircle } from 'lucide-react'

const API = import.meta.env.VITE_API_URL

interface CommentItem {
  id: string
  parent_id: string | null
  author_name: string
  is_owner: boolean         // 현재 요청자가 포폴 주인인지 (스펙)
  author_is_owner: boolean  // 댓글 작성자가 포폴 주인인지 (Author 배지)
  is_mine: boolean
  body: string
  created_at: string | null
  is_deleted: boolean
  can_delete: boolean       // 서버 판단 — 로그인 기준 삭제 권한
  replies?: CommentItem[]
}

interface Props {
  projectId: string
  darkMode: boolean
  isAuthenticated: boolean
  currentUsername?: string
  portfolioOwnerUsername: string
}

const tokenKey = (commentId: string) => `racconto_comment_token_${commentId}`

export default function PortfolioComments({
  projectId, darkMode, isAuthenticated, currentUsername,
}: Props) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()

  // 최상위 댓글 폼
  const [guestName, setGuestName] = useState('')
  const [body, setBody] = useState('')
  const [submitError, setSubmitError] = useState('')

  // 대댓글 폼 — 한 번에 하나만 열림
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyGuestName, setReplyGuestName] = useState('')
  const [replyBody, setReplyBody] = useState('')
  const [replyError, setReplyError] = useState('')

  const { data: comments = [], isLoading } = useQuery<CommentItem[]>({
    queryKey: ['comments', projectId],
    queryFn: async () => (await axios.get(`${API}/comments/${projectId}`)).data,
  })

  // ── mutations ─────────────────────────────────────────────────────────
  const postComment = async (payload: Record<string, string>) => {
    const res = await axios.post(`${API}/comments/${projectId}`, payload)
    return res.data as { id: string; delete_token: string | null; parent_id: string | null }
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = { body: body.trim() }
      if (!isAuthenticated) {
        payload.guest_name = guestName.trim()
      }
      return postComment(payload)
    },
    onSuccess: (data) => {
      if (data.delete_token) localStorage.setItem(tokenKey(data.id), data.delete_token)
      setBody('')
      setSubmitError('')
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] })
    },
    onError: (err: any) => {
      const code = err?.response?.data?.detail
      setSubmitError(typeof code === 'string' ? code : t('portfolio.commentSaveFailed'))
    },
  })

  const replyMutation = useMutation({
    mutationFn: async (parentId: string) => {
      const payload: Record<string, string> = {
        body: replyBody.trim(),
        parent_id: parentId,
      }
      if (!isAuthenticated) {
        payload.guest_name = replyGuestName.trim()
      }
      return postComment(payload)
    },
    onSuccess: (data) => {
      if (data.delete_token) localStorage.setItem(tokenKey(data.id), data.delete_token)
      setReplyingTo(null)
      setReplyBody('')
      setReplyGuestName('')
      setReplyError('')
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] })
    },
    onError: (err: any) => {
      const code = err?.response?.data?.detail
      setReplyError(typeof code === 'string' ? code : t('portfolio.commentSaveFailed'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (comment: CommentItem) => {
      const token = !isAuthenticated ? localStorage.getItem(tokenKey(comment.id)) : null
      const url = token
        ? `${API}/comments/${comment.id}?token=${encodeURIComponent(token)}`
        : `${API}/comments/${comment.id}`
      await axios.delete(url)
      return comment.id
    },
    onSuccess: (commentId) => {
      localStorage.removeItem(tokenKey(commentId))
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] })
    },
    onError: () => {
      setSubmitError(t('portfolio.commentDeleteFailed'))
    },
  })

  // ── handlers ──────────────────────────────────────────────────────────
  const handleSubmit = () => {
    setSubmitError('')
    if (!body.trim()) { setSubmitError(t('portfolio.commentBodyRequired')); return }
    if (!isAuthenticated && !guestName.trim()) {
      setSubmitError(t('portfolio.commentNameRequired')); return
    }
    submitMutation.mutate()
  }

  const handleReplySubmit = (parentId: string) => {
    setReplyError('')
    if (!replyBody.trim()) { setReplyError(t('portfolio.commentBodyRequired')); return }
    if (!isAuthenticated && !replyGuestName.trim()) {
      setReplyError(t('portfolio.commentNameRequired')); return
    }
    replyMutation.mutate(parentId)
  }

  const openReplyForm = (commentId: string) => {
    setReplyingTo(commentId)
    setReplyBody('')
    setReplyError('')
    // guestName/email 은 유지 (다른 댓글로 옮겨도 입력 편의)
  }

  const cancelReply = () => {
    setReplyingTo(null)
    setReplyBody('')
    setReplyError('')
  }

  const handleDelete = (comment: CommentItem) => {
    if (!confirm(t('portfolio.commentDeleteConfirm'))) return
    deleteMutation.mutate(comment)
  }

  const canDelete = (c: CommentItem): boolean => {
    if (c.is_deleted) return false
    if (c.can_delete) return true
    if (!isAuthenticated && localStorage.getItem(tokenKey(c.id))) return true
    return false
  }

  // ── style helpers ────────────────────────────────────────────────────
  const border = darkMode ? 'border-d-line' : 'border-hair'
  const microcopy = darkMode ? 'text-d-faint' : 'text-faint'
  const subText = darkMode ? 'text-d-soft' : 'text-muted'
  const textInk = darkMode ? 'text-d-hair' : 'text-ink'
  const inputClass = `w-full px-3 py-2 text-sm rounded-btn border bg-transparent outline-none transition-colors duration-150 ${
    darkMode
      ? 'border-d-line text-d-hair placeholder:text-d-faint/70 focus:border-d-soft'
      : 'border-hair text-ink placeholder:text-faint focus:border-ink-2'
  }`
  const submitBtnClass = `px-4 py-2 text-sm rounded-btn border transition-colors duration-150 ${
    darkMode
      ? 'border-d-soft text-d-hair hover:bg-d-hair hover:text-d-bg disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-d-hair'
      : 'border-ink text-ink hover:bg-ink hover:text-canvas disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink'
  }`

  const fmt = (iso: string | null) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      const locale = i18n.language.startsWith('ko') ? 'ko-KR'
        : i18n.language.startsWith('ja') ? 'ja-JP' : 'en-US'
      return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  // 보이는 최상위 + 보이는 대댓글 합산
  const visibleCount = comments.reduce((acc, c) => {
    const repliesAlive = (c.replies ?? []).filter(r => !r.is_deleted).length
    return acc + (c.is_deleted ? 0 : 1) + repliesAlive
  }, 0)

  // ── 단일 댓글 행 렌더 ────────────────────────────────────────────────
  const renderCommentRow = (
    c: CommentItem,
    opts: { showReplyButton: boolean } = { showReplyButton: false },
  ) => (
    <div className={c.is_deleted ? 'opacity-40' : ''}>
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className={`text-small font-medium ${textInk}`}>{c.author_name}</span>
        {c.author_is_owner && (
          <span className={`t-eyebrow px-1.5 py-0.5 border rounded-[1px] ${
            darkMode ? 'border-d-line text-d-soft' : 'border-hair text-muted'
          }`}>
            {t('portfolio.commentAuthor')}
          </span>
        )}
        <span className={`t-caption ${microcopy}`}>{fmt(c.created_at)}</span>
        <div className="ml-auto flex items-center gap-3">
          {opts.showReplyButton && !c.is_deleted && (
            <button
              onClick={() => openReplyForm(c.id)}
              className={`inline-flex items-center gap-1 t-caption transition-colors ${
                darkMode ? 'text-d-faint hover:text-d-hair' : 'text-faint hover:text-ink-2'
              }`}
            >
              <MessageCircle size={11} strokeWidth={1.5} />
              {t('portfolio.commentReply')}
            </button>
          )}
          {canDelete(c) && (
            <button
              onClick={() => handleDelete(c)}
              className={`inline-flex items-center gap-1 t-caption transition-colors ${
                darkMode ? 'text-d-faint hover:text-d-hair' : 'text-faint hover:text-ink-2'
              }`}
              aria-label={t('portfolio.commentDelete')}
            >
              <Trash2 size={11} strokeWidth={1.5} />
              {t('portfolio.commentDelete')}
            </button>
          )}
        </div>
      </div>
      <p className={`text-body leading-[1.7] whitespace-pre-wrap break-words ${
        c.is_deleted ? subText : textInk
      }`}>
        {c.body}
      </p>
    </div>
  )

  // ── 대댓글 입력 폼 ───────────────────────────────────────────────────
  const renderReplyForm = (parentId: string) => (
    <div className={`mt-3 pl-4 border-l ${border}`}>
      <div className="flex flex-col gap-2">
        {isAuthenticated ? (
          <p className={`t-caption ${microcopy}`}>
            {t('portfolio.commentAsUser', { username: currentUsername ?? '' })}
          </p>
        ) : (
          <input
            type="text" value={replyGuestName}
            onChange={e => setReplyGuestName(e.target.value)}
            placeholder={t('portfolio.commentNamePlaceholder')}
            maxLength={50} className={`${inputClass} max-w-[200px]`}
          />
        )}
        <textarea
          value={replyBody}
          onChange={e => setReplyBody(e.target.value)}
          placeholder={t('portfolio.replyBodyPlaceholder')}
          maxLength={500} rows={3}
          className={`${inputClass} resize-none`}
        />
        <div className="flex items-center justify-between gap-3">
          <span className={`t-caption ${microcopy}`}>{replyBody.length} / 500</span>
          {replyError && (
            <span className="t-caption text-danger flex-1 truncate">{replyError}</span>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={cancelReply}
              className={`px-3 py-2 text-sm rounded-btn border transition-colors ${
                darkMode ? 'border-d-line text-d-soft hover:text-d-hair' : 'border-hair text-muted hover:text-ink-2'
              }`}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => handleReplySubmit(parentId)}
              disabled={replyMutation.isPending || !replyBody.trim() || (!isAuthenticated && !replyGuestName.trim())}
              className={submitBtnClass}
            >
              {replyMutation.isPending ? t('portfolio.commentSubmitting') : t('portfolio.replySubmit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── 메인 렌더 ────────────────────────────────────────────────────────
  return (
    <div className={`mt-12 pt-10 border-t ${border}`}>
      <p className={`t-eyebrow mb-6 ${microcopy}`}>
        {t('portfolio.commentsCount', { count: visibleCount })}
      </p>

      {/* 댓글 목록 */}
      {isLoading ? (
        <div className={`text-small ${subText} mb-8`}>...</div>
      ) : comments.length === 0 ? (
        <p className={`text-small ${subText} mb-8`}>{t('portfolio.commentsEmpty')}</p>
      ) : (
        <ul className="flex flex-col gap-8 mb-10">
          {comments.map(c => (
            <li key={c.id}>
              {renderCommentRow(c, { showReplyButton: true })}

              {/* 인라인 답글 폼 — 한 번에 하나만 열림 */}
              {replyingTo === c.id && renderReplyForm(c.id)}

              {/* 대댓글 목록 */}
              {c.replies && c.replies.length > 0 && (
                <ul className={`mt-4 pl-6 border-l ${border} flex flex-col gap-5`}>
                  {c.replies.map(r => (
                    <li key={r.id}>
                      {renderCommentRow(r)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* 최상위 댓글 입력 폼 */}
      <div className="flex flex-col gap-2">
        {isAuthenticated ? (
          <p className={`t-caption ${microcopy}`}>
            {t('portfolio.commentAsUser', { username: currentUsername ?? '' })}
          </p>
        ) : (
          <>
            <input
              type="text" value={guestName}
              onChange={e => setGuestName(e.target.value)}
              placeholder={t('portfolio.commentNamePlaceholder')}
              maxLength={50} className={`${inputClass} max-w-[200px]`}
            />
            <p className={`t-caption ${microcopy}`}>{t('portfolio.commentLoginPrompt')}</p>
          </>
        )}

        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={t('portfolio.commentBodyPlaceholder')}
          maxLength={500} rows={4}
          className={`${inputClass} resize-none`}
        />

        <div className="flex items-center justify-between gap-3">
          <span className={`t-caption ${microcopy}`}>{body.length} / 500</span>
          {submitError && (
            <span className="t-caption text-danger flex-1 truncate">{submitError}</span>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || !body.trim() || (!isAuthenticated && !guestName.trim())}
            className={submitBtnClass}
          >
            {submitMutation.isPending ? t('portfolio.commentSubmitting') : t('portfolio.commentSubmit')}
          </button>
        </div>
      </div>
    </div>
  )
}
