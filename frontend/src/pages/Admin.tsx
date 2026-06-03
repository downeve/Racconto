import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { imeSafeClick } from '../utils/imeSafeClick'
import axios from 'axios'
import {
  Search, Trash2, X, Pencil, Megaphone, Mail,
  CheckCircle2, XCircle, LogOut, ChevronDown, Plus, Check, Copy,
} from 'lucide-react'
import { Wordmark } from '../components/Wordmark'
import { Spinner } from '../components/Spinner'
import { ConfirmDialog } from '../components/ConfirmDialog'

const API = import.meta.env.VITE_API_URL

const adminAxios = axios.create()
adminAxios.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

interface User {
  id: string
  email: string
  is_verified: boolean
  project_limit: number
  photo_limit: number
  created_at: string
  project_count: number
  photo_count: number
}

interface Stats {
  total_users: number
  verified_users: number
  total_projects: number
  total_photos: number
  total_notes: number
}

interface ExternalStatsData {
  cloudflare?: { current: number; limit: number }
  linode?: {
    status: string
    label: string
    ipv4: string
    specs?: { disk: number; memory: number }
    cpu_usage: number
    net_out: number
  }
}

interface OrphanResult {
  orphan_ids: string[]
  count: number
  scanned_cf: number
  scanned_db: number
}

interface PanelValues {
  photo_limit: number
  project_limit: number
  is_verified: boolean
}

const PRESETS = [
  { label: 'Open Beta', photo_limit: 1000,  project_limit: 3  },
  { label: 'Basic',     photo_limit: 5000,  project_limit: 15 },
  { label: 'Pro',       photo_limit: 20000, project_limit: 50 },
]

// ─── UsageBar ─────────────────────────────────────────────────────────────────
function UsageBar({ value, limit }: { value: number; limit: number }) {
  const pct = limit > 0 ? Math.min((value / limit) * 100, 100) : 0
  const color = pct >= 100 ? 'bg-edit-danger' : pct >= 80 ? 'bg-edit-warning' : 'bg-edit-ink'
  return (
    <div className="w-full bg-edit-line h-1.5 rounded-[1px] overflow-hidden mt-1">
      <div className={`h-full ${color} transition-all duration-200`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ─── EmailTemplatesSection ────────────────────────────────────────────────────
type TemplateKey = 'verification' | 'password_reset' | 'welcome' | 'social_welcome' | 'farewell'
type Lang = 'ko' | 'en' | 'ja'

interface TemplateFields {
  subject?: string; title?: string; desc?: string; validity?: string
  button?: string; ignore?: string; body?: string; closing?: string
}
type AllTemplates = Record<string, TemplateFields>

const TEMPLATE_META: { key: TemplateKey; label: string; fields: (keyof TemplateFields)[] }[] = [
  { key: 'verification',    label: '이메일 인증',        fields: ['subject','title','desc','validity','button','ignore'] },
  { key: 'password_reset',  label: '비밀번호 재설정',    fields: ['subject','title','desc','validity','button','ignore'] },
  { key: 'welcome',         label: '가입 환영',          fields: ['subject','title','body','button','closing'] },
  { key: 'social_welcome',  label: '소셜 가입 환영',     fields: ['subject','title','body','button','closing'] },
  { key: 'farewell',        label: '탈퇴 안내',          fields: ['subject','title','body','closing'] },
]
const FIELD_LABEL: Record<keyof TemplateFields, string> = {
  subject: 'Subject (제목)', title: 'Title (헤더)', desc: 'Description (본문 설명)',
  validity: 'Validity (유효 시간 안내)', button: 'Button (버튼 텍스트)',
  ignore: 'Ignore notice (무시 안내)', body: 'Body (본문)', closing: 'Closing (맺음말)',
}
const MULTILINE_FIELDS = new Set<keyof TemplateFields>(['desc', 'body', 'closing'])
const LANGS: Lang[] = ['ko', 'en', 'ja']

// 하드코딩 기본값 (email.py의 dict와 동기화)
const DEFAULTS: Record<TemplateKey, Record<Lang, TemplateFields>> = {
  verification: {
    ko: { subject: 'Racconto 가입 이메일 인증', title: '이메일 인증하기', desc: '안녕하세요! Racconto에 오신 것을 환영합니다! 아래 버튼을 클릭하여 이메일 인증을 해주세요.', validity: '보내 드린 인증 링크는 24시간 동안 유효합니다.', button: '이메일 인증하기', ignore: '만약 본인이 요청하지 않은 경우에는 이 이메일을 무시해주세요.' },
    en: { subject: 'Racconto Email Verification', title: 'Email Verification', desc: 'Click the button below to complete your email verification.', validity: 'This link is valid for 24 hours.', button: 'Verify Email', ignore: 'If you did not request this, please ignore this email.' },
    ja: { subject: 'Racconto メール認証', title: 'メール認証', desc: 'Racconto にご登録いただきありがとうございます！以下のボタンをクリックしてメール認証を完了してください。', validity: '認証リンクの有効期限は24時間です。', button: 'メールを認証する', ignore: '心当たりのない場合は、このメールを無視してください。' },
  },
  password_reset: {
    ko: { subject: 'Racconto 비밀번호 재설정', title: '비밀번호 재설정', desc: '아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.', validity: '보내 드린 링크는 1시간 동안 유효합니다.', button: '비밀번호 재설정하기', ignore: '만약 본인이 요청하지 않은 경우에는 이 이메일을 무시해주세요.' },
    en: { subject: 'Racconto Password Reset', title: 'Password Reset', desc: 'Click the button below to set a new password.', validity: 'This link is valid for 1 hour.', button: 'Reset Password', ignore: 'If you did not request this, please ignore this email.' },
    ja: { subject: 'Racconto パスワード再設定', title: 'パスワード再設定', desc: '以下のボタンをクリックして、新しいパスワードを設定してください。', validity: 'リンクの有効期限は1時間です。', button: 'パスワードを再設定する', ignore: '心当たりのない場合は、このメールを無視してください。' },
  },
  welcome: {
    ko: { subject: 'Racconto에 오신 것을 환영합니다', title: '이메일 인증에 성공하였습니다.', body: '이메일 인증이 성공적으로 완료되었습니다.\n\n이제 Racconto와 함께 이야기를 시작할 모든 준비가 끝났습니다.\n프로젝트를 만들고, 당신의 사진에 스토리를 담아보세요.\n\n오픈 베타는 2026년 11월 30일까지 무료로 모든 기능을 이용하실 수 있습니다.', button: 'Racconto 시작하기', closing: 'Racconto와 함께 멋진 이야기를 만들어가세요.' },
    en: { subject: 'Welcome to Racconto', title: 'Your email has been verified', body: 'Your email verification is complete.\n\nYou\'re all set to start telling your photo stories on Racconto.\nCreate a project and bring your photos to life.\n\nThe open beta is free for all features until November 30, 2026.', button: 'Get Started', closing: 'We\'re excited to see the stories you\'ll create.' },
    ja: { subject: 'Racconto へようこそ', title: 'メール認証が完了しました。', body: 'メール認証が正常に完了しました。\n\nRacconto で写真のストーリーを語る準備が整いました。\nプロジェクトを作成して、あなたの写真に物語を添えてみてください。\n\nオープンベータ期間中（2026年11月30日まで）は、すべての機能を無料でご利用いただけます。', button: 'Racconto を始める', closing: 'あなたが生み出す素晴らしいストーリーを楽しみにしています。' },
  },
  social_welcome: {
    ko: { subject: 'Racconto에 오신 것을 환영합니다', title: 'Racconto에 가입해 주셔서 감사합니다.', body: '소셜 계정으로 가입이 완료되었습니다.\n\n이제 Racconto와 함께 이야기를 시작할 모든 준비가 끝났습니다.\n프로젝트를 만들고, 당신의 사진에 스토리를 담아보세요.\n\n오픈 베타는 2026년 11월 30일까지 무료로 모든 기능을 이용하실 수 있습니다.', button: 'Racconto 시작하기', closing: 'Racconto와 함께 멋진 이야기를 만들어가세요.' },
    en: { subject: 'Welcome to Racconto', title: 'Thanks for joining Racconto.', body: 'You\'ve successfully signed up with your social account.\n\nYou\'re all set to start telling your photo stories on Racconto.\nCreate a project and bring your photos to life.\n\nThe open beta is free for all features until November 30, 2026.', button: 'Get Started', closing: 'We\'re excited to see the stories you\'ll create.' },
    ja: { subject: 'Racconto へようこそ', title: 'Racconto にご登録いただきありがとうございます。', body: 'ソーシャルアカウントでの登録が完了しました。\n\nRacconto で写真のストーリーを語る準備が整いました。\nプロジェクトを作成して、あなたの写真に物語を添えてみてください。\n\nオープンベータ期間中（2026年11月30日まで）は、すべての機能を無料でご利用いただけます。', button: 'Racconto を始める', closing: 'あなたが生み出す素晴らしいストーリーを楽しみにしています。' },
  },
  farewell: {
    ko: { subject: 'Racconto 회원 탈퇴가 완료되었습니다', title: '그동안 함께해 주셔서 감사합니다', body: '요청하신 회원 탈퇴가 정상적으로 처리되었습니다.\n\n업로드하신 사진과 모든 개인 데이터는 즉시 삭제되었습니다.\n언제든 다시 돌아오셔서 새로운 이야기를 시작해 보시길 바랍니다.', closing: '지금까지 Racconto를 이용해 주셔서 진심으로 감사드립니다.' },
    en: { subject: 'Your Racconto account has been deleted', title: 'Thank you for being with us', body: 'Your account has been successfully deleted.\n\nAll your photos and personal data have been permanently removed.\nYou are always welcome to come back.', closing: 'Thank you sincerely for using Racconto.' },
    ja: { subject: 'Racconto の退会処理が完了しました', title: 'ご利用ありがとうございました', body: 'ご要望のとおり、退会処理が正常に完了しました。\n\nアップロードされた写真およびすべての個人データは削除されました。\nまたいつでもご利用いただけますので、またのご登録をお待ちしております。', closing: 'これまで Racconto をご利用いただき、誠にありがとうございました。' },
  },
}

// ─── InfraCostsSection ───────────────────────────────────────────────────────
interface InfraCostRow {
  id: number
  service: string
  plan: string
  cost_text: string
  cost_monthly: string  // 합계용 숫자 문자열, 빈 문자열이면 제외
  note: string
  order_num: number
}

const EMPTY_ROW: Omit<InfraCostRow, 'id'> = {
  service: '', plan: '', cost_text: '', cost_monthly: '', note: '', order_num: 0,
}

const InfraCostsSection = () => {
  const [rows, setRows] = useState<InfraCostRow[]>([])
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [draft, setDraft] = useState<Omit<InfraCostRow, 'id'>>(EMPTY_ROW)
  const [saving, setSaving] = useState(false)

  const load = () => {
    adminAxios.get(`${API}/racconto-admin/infra-costs`)
      .then(r => setRows(r.data))
      .catch(() => {})
  }

  useEffect(() => { load() }, [])

  const startEdit = (row: InfraCostRow) => {
    setEditingId(row.id)
    setDraft({ service: row.service, plan: row.plan ?? '', cost_text: row.cost_text ?? '',
               cost_monthly: row.cost_monthly ?? '', note: row.note ?? '', order_num: row.order_num })
  }

  const startNew = () => {
    setEditingId('new')
    setDraft({ ...EMPTY_ROW, order_num: rows.length })
  }

  const cancel = () => { setEditingId(null); setDraft(EMPTY_ROW) }

  const save = async () => {
    if (!draft.service.trim()) return
    setSaving(true)
    try {
      if (editingId === 'new') {
        await adminAxios.post(`${API}/racconto-admin/infra-costs`, draft)
      } else {
        await adminAxios.put(`${API}/racconto-admin/infra-costs/${editingId}`, draft)
      }
      load()
      cancel()
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: number) => {
    if (!confirm('삭제할까요?')) return
    await adminAxios.delete(`${API}/racconto-admin/infra-costs/${id}`)
    load()
  }

  const total = rows.reduce((sum, r) => {
    const v = parseFloat(r.cost_monthly)
    return sum + (isNaN(v) ? 0 : v)
  }, 0)

  const inputCls = 'w-full bg-transparent border-b border-edit-accent outline-none text-sm text-edit-ink py-0.5'

  return (
    <div className="mb-8">
      <p className="t-eyebrow text-edit-muted mb-3">Infrastructure Costs</p>
      <div className="border border-edit-line rounded-[1px] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edit-line text-left">
              <th className="px-4 py-2.5 t-eyebrow text-edit-muted font-normal">Service</th>
              <th className="px-4 py-2.5 t-eyebrow text-edit-muted font-normal">Plan</th>
              <th className="px-4 py-2.5 t-eyebrow text-edit-muted font-normal">Cost</th>
              <th className="px-4 py-2.5 t-eyebrow text-edit-muted font-normal">Monthly (USD)</th>
              <th className="px-4 py-2.5 t-eyebrow text-edit-muted font-normal">Note</th>
              <th className="px-4 py-2.5 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              editingId === row.id ? (
                <tr key={row.id} className="border-b border-edit-line bg-edit-paper">
                  <td className="px-4 py-2">
                    <input className={inputCls} value={draft.service}
                      onChange={e => setDraft(d => ({ ...d, service: e.target.value }))} autoFocus />
                  </td>
                  <td className="px-4 py-2">
                    <input className={inputCls} value={draft.plan}
                      onChange={e => setDraft(d => ({ ...d, plan: e.target.value }))} />
                  </td>
                  <td className="px-4 py-2">
                    <input className={inputCls} value={draft.cost_text} placeholder="e.g. $13.2 / mo"
                      onChange={e => setDraft(d => ({ ...d, cost_text: e.target.value }))} />
                  </td>
                  <td className="px-4 py-2">
                    <input className={inputCls} value={draft.cost_monthly} placeholder="13.2"
                      onChange={e => setDraft(d => ({ ...d, cost_monthly: e.target.value }))} />
                  </td>
                  <td className="px-4 py-2">
                    <input className={inputCls} value={draft.note}
                      onChange={e => setDraft(d => ({ ...d, note: e.target.value }))} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button onClick={save} disabled={saving}
                        className="text-edit-accent hover:opacity-70 transition-opacity">
                        <Check size={14} strokeWidth={1.5} />
                      </button>
                      <button onClick={cancel} className="text-edit-muted hover:opacity-70 transition-opacity">
                        <X size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={row.id} className={i < rows.length - 1 ? 'border-b border-edit-line' : ''}>
                  <td className="px-4 py-3 text-body text-edit-ink">{row.service}</td>
                  <td className="px-4 py-3 text-body text-edit-muted">{row.plan}</td>
                  <td className="px-4 py-3 font-mono text-body text-edit-ink">{row.cost_text || '—'}</td>
                  <td className="px-4 py-3 font-mono text-body text-edit-muted">
                    {row.cost_monthly ? `$${row.cost_monthly}` : '—'}
                  </td>
                  <td className="px-4 py-3 t-caption text-edit-faint">{row.note}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(row)}
                        className="text-edit-muted hover:text-edit-ink transition-colors">
                        <Pencil size={12} strokeWidth={1.5} />
                      </button>
                      <button onClick={() => remove(row.id)}
                        className="text-edit-muted hover:text-danger transition-colors">
                        <Trash2 size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            ))}

            {editingId === 'new' && (
              <tr className="border-b border-edit-line bg-edit-paper">
                <td className="px-4 py-2">
                  <input className={inputCls} value={draft.service} placeholder="Service"
                    onChange={e => setDraft(d => ({ ...d, service: e.target.value }))} autoFocus />
                </td>
                <td className="px-4 py-2">
                  <input className={inputCls} value={draft.plan} placeholder="Plan"
                    onChange={e => setDraft(d => ({ ...d, plan: e.target.value }))} />
                </td>
                <td className="px-4 py-2">
                  <input className={inputCls} value={draft.cost_text} placeholder="e.g. $13.2 / mo"
                    onChange={e => setDraft(d => ({ ...d, cost_text: e.target.value }))} />
                </td>
                <td className="px-4 py-2">
                  <input className={inputCls} value={draft.cost_monthly} placeholder="13.2"
                    onChange={e => setDraft(d => ({ ...d, cost_monthly: e.target.value }))} />
                </td>
                <td className="px-4 py-2">
                  <input className={inputCls} value={draft.note} placeholder="Note"
                    onChange={e => setDraft(d => ({ ...d, note: e.target.value }))} />
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <button onClick={save} disabled={saving}
                      className="text-edit-accent hover:opacity-70 transition-opacity">
                      <Check size={14} strokeWidth={1.5} />
                    </button>
                    <button onClick={cancel} className="text-edit-muted hover:opacity-70 transition-opacity">
                      <X size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            <tr className="bg-edit-paper border-t border-edit-line">
              <td className="px-4 py-2.5 t-eyebrow text-edit-muted" colSpan={2}>
                Monthly Total (approx.)
              </td>
              <td className="px-4 py-2.5 font-mono text-body text-edit-ink" colSpan={2}>
                {total > 0 ? `$${total.toFixed(2)} / mo` : '—'}
              </td>
              <td className="px-4 py-2.5 t-caption text-edit-faint"></td>
              <td className="px-4 py-2.5">
                {editingId === null && (
                  <button onClick={startNew}
                    className="text-edit-muted hover:text-edit-ink transition-colors">
                    <Plus size={14} strokeWidth={1.5} />
                  </button>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── ActivityStatsSection ─────────────────────────────────────────────────────
interface ActivityStats {
  dau: number
  wau: number
  mau: number
  daily: { date: string; count: number }[]
  countries: { country: string; count: number }[]
}

const COUNTRY_NAME: Record<string, string> = {
  KR: '한국', JP: '일본', US: '미국', GB: '영국', DE: '독일',
  FR: '프랑스', CN: '중국', TW: '대만', SG: '싱가포르', AU: '호주',
  CA: '캐나다', NL: '네덜란드', HK: '홍콩',
}

const ActivityStatsSection = () => {
  const [data, setData] = useState<ActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    adminAxios.get(`${API}/racconto-admin/activity-stats`)
      .then(res => setData(res.data))
      .catch(err => console.error('activity-stats 조회 실패', err))
      .finally(() => setLoading(false))
  }, [open])

  const maxDaily = data ? Math.max(...data.daily.map(d => d.count), 1) : 1

  return (
    <div className="mb-10">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 t-eyebrow text-edit-muted hover:text-edit-ink transition-colors mb-3"
      >
        <ChevronDown size={12} strokeWidth={1.5} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
        Active Users
      </button>

      {open && (
        loading ? (
          <div className="py-6 flex items-center gap-2 text-edit-muted">
            <Spinner size={14} /> <span className="t-caption">불러오는 중...</span>
          </div>
        ) : !data ? (
          <div className="t-caption text-edit-danger py-4">데이터 없음</div>
        ) : (
          <div className="space-y-6">
            {/* DAU / WAU / MAU */}
            <div className="grid grid-cols-3 border border-edit-line rounded-[1px]">
              {[
                { label: 'DAU', sub: '오늘', value: data.dau },
                { label: 'WAU', sub: '최근 7일', value: data.wau },
                { label: 'MAU', sub: '최근 30일', value: data.mau },
              ].map((s, i) => (
                <div key={s.label} className={`px-6 py-5 ${i > 0 ? 'border-l border-edit-line' : ''}`}>
                  <p className="t-eyebrow text-edit-muted mb-1">{s.label} <span className="normal-case font-sans opacity-60">({s.sub})</span></p>
                  <p className="font-serif text-h2 font-normal tracking-tight">{s.value.toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* 일별 bar chart */}
            {data.daily.length > 0 && (
              <div>
                <p className="t-eyebrow text-edit-muted mb-3">Daily Active Users (최근 30일)</p>
                <div className="border border-edit-line rounded-[1px] p-4">
                  <div className="flex items-end gap-[3px] h-24">
                    {data.daily.map(d => (
                      <div
                        key={d.date}
                        className="flex-1 bg-edit-accent/70 hover:bg-edit-accent rounded-sm transition-colors relative group"
                        style={{ height: `${Math.max((d.count / maxDaily) * 100, 4)}%` }}
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-edit-ink text-edit-paper t-caption rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {d.date.slice(5)} · {d.count}명
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="t-caption text-edit-faint">{data.daily[0]?.date.slice(5)}</span>
                    <span className="t-caption text-edit-faint">{data.daily[data.daily.length - 1]?.date.slice(5)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 국가 분포 */}
            {data.countries.length > 0 && (
              <div>
                <p className="t-eyebrow text-edit-muted mb-3">국가 분포 (최근 30일)</p>
                <div className="border border-edit-line rounded-[1px] overflow-hidden">
                  {data.countries.map((c, i) => {
                    const total = data.countries.reduce((s, x) => s + x.count, 0)
                    const pct = Math.round((c.count / total) * 100)
                    return (
                      <div key={c.country} className={`flex items-center gap-4 px-4 py-2.5 ${i > 0 ? 'border-t border-edit-line' : ''}`}>
                        <span className="t-eyebrow text-edit-muted w-8">{c.country}</span>
                        <span className="text-small text-edit-ink flex-1">{COUNTRY_NAME[c.country] ?? c.country}</span>
                        <div className="w-32 h-1.5 bg-edit-line rounded-full overflow-hidden">
                          <div className="h-full bg-edit-accent rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="t-caption text-edit-muted w-12 text-right">{c.count}명 ({pct}%)</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}

const EmailTemplatesSection = () => {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<AllTemplates>({})
  const [selectedKey, setSelectedKey] = useState<TemplateKey>('verification')
  const [selectedLang, setSelectedLang] = useState<Lang>('ko')
  const [draft, setDraft] = useState<TemplateFields>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)
  // 필드 input/textarea DOM 직접 읽기용 — 한글 IME composition 후 React state 가 stale 인 race 방지
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({})

  const showToast = (message: string, ok: boolean) => {
    setToast({ message, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchTemplates = async () => {
    try {
      const res = await adminAxios.get(`${API}/racconto-admin/email-templates`)
      setTemplates(res.data)
    } catch { /* ignore */ }
  }

  useEffect(() => { if (open) fetchTemplates() }, [open])

  useEffect(() => {
    const stored = templates[`${selectedKey}__${selectedLang}`] ?? {}
    const defaults = DEFAULTS[selectedKey][selectedLang]
    // DB에 저장된 값이 있으면 우선 사용, 없는 필드는 하드코딩 기본값으로 채움
    const merged: TemplateFields = { ...defaults }
    for (const k of Object.keys(defaults) as (keyof TemplateFields)[]) {
      if (stored[k]) merged[k] = stored[k]
    }
    setDraft(merged)
  }, [selectedKey, selectedLang, templates])

  const meta = TEMPLATE_META.find(m => m.key === selectedKey)!

  const handleSave = async () => {
    setSaving(true)
    // input/textarea DOM 우선 읽기 (IME race 방지) — React state 가 아직 commit 안 됐어도 최신 값
    const payload: TemplateFields = { ...draft }
    for (const k of Object.keys(payload) as (keyof TemplateFields)[]) {
      const el = fieldRefs.current[k as string]
      if (el) payload[k] = el.value
    }
    try {
      await adminAxios.put(`${API}/racconto-admin/email-templates/${selectedKey}/${selectedLang}`, payload)
      await fetchTemplates()
      showToast('저장되었습니다.', true)
    } catch {
      showToast('저장 실패.', false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-8">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-2 t-caption px-4 py-2
                   border border-edit-line rounded-[1px] hover:bg-edit-paper transition-colors"
      >
        <Mail size={12} strokeWidth={1.5} />
        이메일 템플릿 관리
        <ChevronDown size={12} strokeWidth={1.5} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 border border-edit-line rounded-[1px] p-5 max-w-2xl">
          {/* 템플릿 타입 선택 */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {TEMPLATE_META.map(m => (
              <button
                key={m.key}
                onClick={() => setSelectedKey(m.key)}
                className={`t-caption px-3 py-1.5 rounded-[1px] border transition-colors
                  ${selectedKey === m.key
                    ? 'bg-edit-ink text-edit-paper border-edit-ink'
                    : 'border-edit-line text-edit-muted hover:border-edit-ink hover:text-edit-ink'}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* 언어 선택 */}
          <div className="flex gap-1.5 mb-5">
            {LANGS.map(lang => (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                className={`t-caption px-3 py-1 rounded-[1px] border transition-colors uppercase
                  ${selectedLang === lang
                    ? 'bg-edit-ink text-edit-paper border-edit-ink'
                    : 'border-edit-line text-edit-muted hover:border-edit-ink hover:text-edit-ink'}`}
              >
                {lang}
              </button>
            ))}
          </div>

          {/* 필드 편집 */}
          <div className="space-y-4">
            {meta.fields.map(field => (
              <div key={field}>
                <p className="t-eyebrow text-edit-muted mb-1">{FIELD_LABEL[field]}</p>
                {MULTILINE_FIELDS.has(field) ? (
                  <textarea
                    ref={el => { fieldRefs.current[field as string] = el }}
                    value={draft[field] ?? ''}
                    onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))}
                    rows={3}
                    placeholder=""
                    className="w-full font-serif text-body bg-transparent border-0 border-b
                               border-edit-line focus:border-edit-ink focus:outline-none py-2
                               placeholder:text-edit-faint resize-none transition-colors"
                  />
                ) : (
                  <input
                    ref={el => { fieldRefs.current[field as string] = el }}
                    type="text"
                    value={draft[field] ?? ''}
                    onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))}
                    placeholder=""
                    className="w-full font-serif text-body bg-transparent border-0 border-b
                               border-edit-line focus:border-edit-ink focus:outline-none py-2
                               placeholder:text-edit-faint transition-colors"
                  />
                )}
              </div>
            ))}
          </div>

          {toast && (
            <p className={`t-caption mt-4 inline-flex items-center gap-1.5
                           ${toast.ok ? 'text-edit-warning' : 'text-edit-danger'}`}>
              {toast.ok
                ? <CheckCircle2 size={11} strokeWidth={1.5} />
                : <XCircle size={11} strokeWidth={1.5} />}
              {toast.message}
            </p>
          )}

          <div className="mt-5">
            <button
              {...imeSafeClick(handleSave)}
              disabled={saving}
              className="inline-flex items-center gap-2 t-caption px-5 py-2.5
                         bg-edit-ink text-edit-paper rounded-[1px]
                         hover:bg-edit-ink/85 disabled:opacity-40 transition-colors"
            >
              {saving && <Spinner size={11} />}
              {saving ? 'Saving...' : '저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── OrphanSection ────────────────────────────────────────────────────────────
const OrphanSection = () => {
  const [result, setResult] = useState<OrphanResult | null>(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const showToast = (message: string, ok: boolean) => {
    setToast({ message, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const handleScan = async () => {
    setScanLoading(true)
    setResult(null)
    try {
      const res = await adminAxios.get(`${API}/racconto-admin/orphan-images/scan`)
      setResult(res.data)
    } catch {
      showToast('Scan failed.', false)
    } finally {
      setScanLoading(false)
    }
  }

  const handleCleanup = async () => {
    if (!result || result.count === 0) return
    setCleanupLoading(true)
    try {
      await adminAxios.post(
        `${API}/racconto-admin/orphan-images/cleanup`,
        { image_ids: result.orphan_ids },
      )
      showToast(`Queued deletion of ${result.count} orphan image(s).`, true)
      setResult(null)
    } catch {
      showToast('Cleanup failed.', false)
    } finally {
      setCleanupLoading(false)
    }
  }

  return (
    <div className="mb-8">
      <p className="t-eyebrow text-edit-muted mb-3">Orphan Images</p>
      <div className="border border-edit-line rounded-[1px] p-5 max-w-xl">
        <p className="text-body text-edit-muted mb-4">
          CF에 존재하지만 DB에 없는 이미지(업로드 24시간 경과)를 검사하고 삭제합니다.
        </p>
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleScan}
            disabled={scanLoading}
            className="inline-flex items-center gap-1.5 t-caption px-4 py-2
                       border border-edit-line-strong text-edit-ink rounded-[1px]
                       hover:bg-edit-paper disabled:opacity-40 transition-colors"
          >
            {scanLoading ? <Spinner size={12} /> : <Search size={13} strokeWidth={1.5} />}
            {scanLoading ? 'Scanning...' : '고아 이미지 검사'}
          </button>
          {result && result.count > 0 && (
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={cleanupLoading}
              className="inline-flex items-center gap-1.5 t-caption px-4 py-2
                         border border-edit-danger/30 text-edit-danger rounded-[1px]
                         hover:bg-edit-danger hover:text-edit-paper
                         disabled:opacity-40 transition-colors"
            >
              {cleanupLoading ? <Spinner size={12} /> : <Trash2 size={13} strokeWidth={1.5} />}
              {cleanupLoading ? 'Deleting...' : `고아 이미지 일괄 삭제 (${result.count}개)`}
            </button>
          )}
        </div>
        {result && (
          <div className="t-caption text-edit-muted space-y-1 border-t border-edit-line pt-3">
            <p>CF 전체: <span className="font-mono text-edit-ink">{result.scanned_cf}</span>장 · DB 등록: <span className="font-mono text-edit-ink">{result.scanned_db}</span>장</p>
            <p>
              고아 이미지:{' '}
              <span className={`font-mono font-medium ${result.count > 0 ? 'text-edit-danger' : 'text-edit-warning'}`}>
                {result.count}개
              </span>
              {result.count === 0 && ' — 정상'}
            </p>
          </div>
        )}
        {toast && (
          <p className={`t-caption mt-3 inline-flex items-center gap-1.5
                         ${toast.ok ? 'text-edit-warning' : 'text-edit-danger'}`}>
            {toast.ok
              ? <CheckCircle2 size={11} strokeWidth={1.5} />
              : <XCircle size={11} strokeWidth={1.5} />}
            {toast.message}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => { setConfirmOpen(false); await handleCleanup() }}
        variant="danger"
        title="고아 이미지를 삭제할까요?"
        description={`Cloudflare에서 ${result?.count ?? 0}개의 이미지를 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제 확인"
      />
    </div>
  )
}

// ─── ProjectDuplicateSection ──────────────────────────────────────────────────
// Admin 전용: admin 본인 프로젝트를 그대로 복제 → admin 본인에게 새 프로젝트 생성.
// 사진은 image_url 재사용, 챕터·노트 포함. 다른 유저의 프로젝트는 복제 불가.
interface AdminOwnProject {
  id: string
  title: string
  slug: string | null
}

const ProjectDuplicateSection = () => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<AdminOwnProject[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [sourceId, setSourceId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setProjectsLoading(true)
    adminAxios.get(`${API}/projects/`)
      .then(res => {
        if (cancelled) return
        const list: AdminOwnProject[] = res.data.map((p: any) => ({
          id: p.id, title: p.title, slug: p.slug,
        }))
        setProjects(list)
      })
      .catch(() => { if (!cancelled) setProjects([]) })
      .finally(() => { if (!cancelled) setProjectsLoading(false) })
    return () => { cancelled = true }
  }, [open])

  const submit = async () => {
    if (!sourceId) return
    setSubmitting(true)
    setResult(null)
    try {
      const res = await adminAxios.post(
        `${API}/racconto-admin/projects/${sourceId}/duplicate`,
      )
      const d = res.data
      // /projects 페이지의 stale 캐시 → 새 리스트 교체 중 레이아웃 시프트로 클릭이 빠지는 현상 방지
      await queryClient.refetchQueries({ queryKey: ['projects'] })
      setResult({
        ok: true,
        message: `복제 완료 — new id: ${d.id} / slug: ${d.slug} / photos: ${d.photos_copied}, chapters: ${d.chapters_copied}, notes: ${d.notes_copied}`,
      })
      setSourceId('')
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      setResult({ ok: false, message: typeof detail === 'string' ? detail : '복제 실패' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mb-8">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 t-caption px-4 py-2
                     border border-edit-line rounded-[1px] hover:bg-edit-paper transition-colors"
        >
          <Copy size={12} strokeWidth={1.5} />
          프로젝트 복제
        </button>
      ) : (
        <div className="border border-edit-line rounded-[1px] p-5 max-w-xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Copy size={14} strokeWidth={1.5} className="text-edit-muted" />
              <p className="font-serif text-h3 font-normal tracking-tight text-edit-ink">
                프로젝트 복제
              </p>
            </div>
            <button
              onClick={() => { setOpen(false); setResult(null); setSourceId('') }}
              className="text-edit-muted hover:text-edit-ink transition-colors"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="t-eyebrow text-edit-muted mb-1">원본 프로젝트 (admin 본인)</p>
              <select
                value={sourceId}
                onChange={e => setSourceId(e.target.value)}
                disabled={projectsLoading}
                className="w-full font-serif text-body bg-transparent border-0 border-b
                           border-edit-line focus:border-edit-ink focus:outline-none py-2
                           transition-colors disabled:opacity-40"
              >
                <option value="">
                  {projectsLoading
                    ? '불러오는 중…'
                    : projects.length === 0 ? '프로젝트 없음' : '— 선택 —'}
                </option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <p className="t-caption text-edit-faint">
              admin 본인 계정에 새 프로젝트로 복제됩니다. 사진은 image_url을 그대로 재사용 (Cloudflare 재업로드 없음). 챕터·노트 포함, 댓글·납품링크 제외. 복제본은 비공개로 시작.
            </p>
          </div>

          {result && (
            <p className={`t-caption mt-4 ${result.ok ? 'text-edit-ink' : 'text-edit-muted'}`}>
              {result.message}
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              onClick={() => { setOpen(false); setResult(null); setSourceId('') }}
              className="t-caption px-4 py-2 border border-edit-line rounded-[1px] hover:bg-edit-paper transition-colors"
            >
              취소
            </button>
            <button
              onClick={submit}
              disabled={!sourceId || submitting}
              className="t-caption px-4 py-2 bg-edit-ink text-edit-paper rounded-[1px]
                         hover:bg-edit-ink/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? '복제 중…' : '복제 실행'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ExternalStatsSection ─────────────────────────────────────────────────────
const ExternalStatsSection = () => {
  const [data, setData] = useState<ExternalStatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminAxios.get(`${API}/racconto-admin/external-stats`)
      .then(res => setData(res.data))
      .catch(err => console.error('통계 조회 실패', err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="py-6 flex items-center gap-2 text-edit-muted">
      <Spinner size={14} /> <span className="t-caption">외부 통계 데이터를 불러오는 중...</span>
    </div>
  )
  if (!data) return (
    <div className="t-caption text-edit-danger py-4">데이터가 비어있음</div>
  )

  const cfPct = data.cloudflare
    ? Math.min((data.cloudflare.current / (data.cloudflare.limit || 1)) * 100, 100)
    : 0
  const linodeRunning = data.linode?.status === 'running'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
      {/* Cloudflare */}
      <div className="border border-edit-line rounded-[1px] p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="t-eyebrow text-edit-muted">Cloudflare Images</p>
          <span className="t-eyebrow px-2 py-0.5 border border-edit-warning/30
                           text-edit-warning rounded-[1px]">
            Images v1
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-body text-edit-muted">현재 이미지 수</span>
            <span className="font-serif text-body text-edit-ink font-normal">
              {data.cloudflare?.current?.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-edit-line h-1.5 rounded-[1px] overflow-hidden">
            <div className="bg-edit-ink h-full" style={{ width: `${cfPct}%` }} />
          </div>
          <p className="t-caption text-edit-faint text-right">
            한도: {data.cloudflare?.limit?.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Linode */}
      <div className="border border-edit-line rounded-[1px] p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="t-eyebrow text-edit-muted">Linode Server</p>
          <span className={`t-eyebrow px-2 py-0.5 border rounded-[1px]
                            ${linodeRunning
                              ? 'border-edit-warning/30 text-edit-warning'
                              : 'border-edit-danger/30 text-edit-danger'}`}>
            {data.linode?.status?.toUpperCase()}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="t-eyebrow text-edit-faint">서버명</p>
            <p className="text-body text-edit-ink">{data.linode?.label}</p>
          </div>
          <div>
            <p className="t-eyebrow text-edit-faint">IP 주소</p>
            <p className="text-body text-edit-ink font-mono">{data.linode?.ipv4}</p>
          </div>
          <div className="col-span-2 pt-2 border-t border-edit-line">
            <p className="t-eyebrow text-edit-faint">사양 (Storage / RAM)</p>
            <p className="text-body text-edit-ink">
              {(data.linode?.specs?.disk ?? 0) / 1024}GB / {(data.linode?.specs?.memory ?? 0) / 1024}GB
            </p>
          </div>
          <div className="col-span-2 pt-2 border-t border-edit-line">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="t-eyebrow text-edit-faint">CPU 사용량</p>
                <p className="text-body text-edit-ink">{data.linode?.cpu_usage}%</p>
              </div>
              <div>
                <p className="t-eyebrow text-edit-faint">네트워크 Out</p>
                <p className="text-body text-edit-ink">{data.linode?.net_out} Mbps</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── UserEditPanel ────────────────────────────────────────────────────────────
interface UserEditPanelProps {
  user: User | null
  values: PanelValues
  onChange: (v: PanelValues) => void
  saving: boolean
  onSave: () => void
  onDelete: () => void
  onClose: () => void
  panelRef: React.RefObject<HTMLDivElement | null>
}

function UserEditPanel({
  user, values, onChange, saving,
  onSave, onDelete, onClose, panelRef,
}: UserEditPanelProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  const activePreset = PRESETS.find(
    p => p.photo_limit === values.photo_limit && p.project_limit === values.project_limit
  )
  const photoPct   = values.photo_limit   > 0 ? Math.round((user?.photo_count   ?? 0) / values.photo_limit   * 100) : 0
  const projectPct = values.project_limit > 0 ? Math.round((user?.project_count ?? 0) / values.project_limit * 100) : 0

  return (
    <>
      <div
        ref={panelRef}
        className={`fixed right-0 top-0 bottom-0 w-80 bg-edit-canvas border-l border-edit-line
                    shadow-[0_0_40px_rgba(0,0,0,0.06)] z-40 flex flex-col
                    transition-transform duration-200
                    ${user ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-edit-line shrink-0">
          <div className="min-w-0">
            <p className="font-serif text-body text-edit-ink truncate">{user?.email}</p>
            <p className="t-caption text-edit-faint mt-0.5">
              가입일: {user ? new Date(user.created_at).toLocaleDateString('ko-KR') : ''}
            </p>
          </div>
          <button onClick={onClose} className="ml-3 shrink-0 text-edit-muted hover:text-edit-ink transition-colors">
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Presets */}
          <div>
            <p className="t-eyebrow text-edit-muted mb-2">프리셋</p>
            <div className="inline-flex border border-edit-line rounded-[1px] p-0.5 bg-edit-paper w-full">
              {PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => onChange({ ...values, photo_limit: preset.photo_limit, project_limit: preset.project_limit })}
                  className={`flex-1 t-caption py-1.5 rounded-[1px] transition-colors duration-150
                              ${activePreset?.label === preset.label
                                ? 'bg-edit-ink text-edit-paper'
                                : 'text-edit-muted hover:text-edit-ink'}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-edit-line" />

          {/* Photo Limit */}
          <div>
            <p className="t-eyebrow text-edit-muted mb-2">Photo Limit</p>
            <div className="flex items-center gap-2 mb-1.5">
              <input
                type="range"
                min={0} max={2000} step={50}
                value={values.photo_limit}
                onChange={e => onChange({ ...values, photo_limit: Number(e.target.value) })}
                className="flex-1 accent-current"
              />
              <input
                type="number"
                min={0} max={2000}
                value={values.photo_limit}
                onChange={e => onChange({ ...values, photo_limit: Number(e.target.value) })}
                className="w-16 border border-edit-line rounded-[1px] px-2 py-1
                           text-body text-right outline-none focus:border-edit-ink bg-transparent"
              />
            </div>
            <p className="t-caption text-edit-muted">현재: {user?.photo_count ?? 0}장 ({photoPct}%)</p>
            <UsageBar value={user?.photo_count ?? 0} limit={values.photo_limit} />
          </div>

          <div className="border-t border-edit-line" />

          {/* Project Limit */}
          <div>
            <p className="t-eyebrow text-edit-muted mb-2">Project Limit</p>
            <div className="flex items-center gap-2 mb-1.5">
              <input
                type="range"
                min={0} max={50} step={1}
                value={values.project_limit}
                onChange={e => onChange({ ...values, project_limit: Number(e.target.value) })}
                className="flex-1 accent-current"
              />
              <input
                type="number"
                min={0} max={50}
                value={values.project_limit}
                onChange={e => onChange({ ...values, project_limit: Number(e.target.value) })}
                className="w-16 border border-edit-line rounded-[1px] px-2 py-1
                           text-body text-right outline-none focus:border-edit-ink bg-transparent"
              />
            </div>
            <p className="t-caption text-edit-muted">현재: {user?.project_count ?? 0}개 ({projectPct}%)</p>
            <UsageBar value={user?.project_count ?? 0} limit={values.project_limit} />
          </div>

          <div className="border-t border-edit-line" />

          {/* Verified */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={values.is_verified}
              onChange={e => onChange({ ...values, is_verified: e.target.checked })}
              className="w-4 h-4 accent-current"
            />
            <span className="text-body text-edit-ink">Verified</span>
          </label>

          <div className="border-t border-edit-line" />

          {/* Save */}
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full py-2.5 t-caption tracking-[0.08em] bg-edit-ink text-edit-paper
                       rounded-[1px] hover:bg-edit-ink/85 disabled:opacity-40 transition-colors
                       inline-flex items-center justify-center gap-2"
          >
            {saving && <Spinner size={11} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          <div className="border-t border-edit-line" />

          {/* Delete */}
          <button
            onClick={() => setConfirmDeleteOpen(true)}
            className="w-full py-2.5 t-caption text-edit-danger border border-edit-danger/30
                       rounded-[1px] hover:bg-edit-danger hover:text-edit-paper transition-colors"
          >
            Delete Account…
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => { setConfirmDeleteOpen(false); await onDelete() }}
        variant="danger"
        title="계정을 삭제할까요?"
        description="이 작업은 되돌릴 수 없습니다. 사용자의 모든 데이터가 영구적으로 삭제됩니다."
        confirmLabel="삭제 확인"
      />
    </>
  )
}

// ─── Admin ────────────────────────────────────────────────────────────────────
export default function Admin() {
  const [users, setUsers]           = useState<User[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [searchEmail, setSearchEmail] = useState('')
  const [sortOrder, setSortOrder]   = useState<'asc' | 'desc'>('asc')
  const [stats, setStats]           = useState<Stats | null>(null)
  const [showNotify, setShowNotify] = useState(false)
  const [notifySubject, setNotifySubject]   = useState('')
  const [notifyContent, setNotifyContent]   = useState('')
  const [notifyVerifiedOnly, setNotifyVerifiedOnly] = useState(true)
  const [notifying, setNotifying]   = useState(false)
  const [notifyResult, setNotifyResult] = useState<{ message: string; ok: boolean } | null>(null)
  const [confirmNotifyOpen, setConfirmNotifyOpen] = useState(false)

  // Panel
  const [selectedUser, setSelectedUser]   = useState<User | null>(null)
  const [panelValues, setPanelValues]     = useState<PanelValues>({ photo_limit: 0, project_limit: 0, is_verified: false })
  const [panelSaving, setPanelSaving] = useState(false)

  // Bulk
  const [selectedIds, setSelectedIds]           = useState<Set<string>>(new Set())
  const [bulkPhotoLimit, setBulkPhotoLimit]     = useState('')
  const [bulkProjectLimit, setBulkProjectLimit] = useState('')
  const [bulkApplying, setBulkApplying]         = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!selectedUser) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-edit-btn]')) return
      if (panelRef.current && !panelRef.current.contains(target)) {
        setSelectedUser(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [selectedUser])

  const fetchUsers = async () => {
    try {
      const res = await adminAxios.get(`${API}/racconto-admin/users`)
      setUsers(res.data)
    } catch (e: any) {
      if (e.response?.status === 403) navigate('/projects')
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    const res = await adminAxios.get(`${API}/racconto-admin/stats`)
    setStats(res.data)
  }

  useEffect(() => {
    fetchUsers()
    fetchStats()
  }, [])

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setPanelValues({ photo_limit: user.photo_limit, project_limit: user.project_limit, is_verified: user.is_verified })
  }

  const handlePanelSave = async () => {
    if (!selectedUser) return
    setPanelSaving(true)
    try {
      await adminAxios.put(`${API}/racconto-admin/users/${selectedUser.id}`, panelValues)
      await fetchUsers()
      setSelectedUser(null)
    } finally {
      setPanelSaving(false)
    }
  }

  const handlePanelDelete = async () => {
    if (!selectedUser) return
    try {
      await adminAxios.delete(`${API}/racconto-admin/users/${selectedUser.id}`)
      await fetchUsers()
      setSelectedUser(null)
    } catch {
      // no-op
    }
  }

  const handleBulkApply = async (overrideValues?: { photo_limit?: number; project_limit?: number }) => {
    const payload: Record<string, number> = {}
    if (overrideValues) {
      if (overrideValues.photo_limit   !== undefined) payload.photo_limit   = overrideValues.photo_limit
      if (overrideValues.project_limit !== undefined) payload.project_limit = overrideValues.project_limit
    } else {
      if (bulkPhotoLimit   !== '') payload.photo_limit   = Number(bulkPhotoLimit)
      if (bulkProjectLimit !== '') payload.project_limit = Number(bulkProjectLimit)
    }
    if (Object.keys(payload).length === 0) return
    setBulkApplying(true)
    try {
      await Promise.all([...selectedIds].map(id => adminAxios.put(`${API}/racconto-admin/users/${id}`, payload)))
      await fetchUsers()
      setSelectedIds(new Set())
      setBulkPhotoLimit('')
      setBulkProjectLimit('')
    } finally {
      setBulkApplying(false)
    }
  }

  const handleNotify = async () => {
    setNotifying(true)
    setNotifyResult(null)
    try {
      const res = await adminAxios.post(`${API}/racconto-admin/notify`, {
        subject: notifySubject,
        content: notifyContent,
        verified_only: notifyVerifiedOnly,
      })
      setNotifyResult({ message: `Queued for ${res.data.recipients} recipients`, ok: true })
      setNotifySubject('')
      setNotifyContent('')
    } catch {
      setNotifyResult({ message: 'Failed to send notice', ok: false })
    } finally {
      setNotifying(false)
    }
  }

  const filteredUsers = users
    .filter(u => u.email.toLowerCase().includes(searchEmail.toLowerCase()))
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sortOrder === 'asc' ? diff : -diff
    })

  const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id))

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredUsers.map(u => u.id)))
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const recipientCount = notifyVerifiedOnly
    ? users.filter(u => u.is_verified).length
    : users.length

  if (loading) return (
    <div className="min-h-screen bg-edit-canvas flex items-center justify-center">
      <Spinner size={20} className="text-edit-muted" />
    </div>
  )
  if (error) return (
    <div className="min-h-screen bg-edit-canvas flex items-center justify-center">
      <p className="t-caption text-edit-danger">{error}</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-edit-canvas">
      {/* Top bar */}
      <header className="border-b border-edit-line bg-edit-canvas/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <Wordmark size="md" />
            <span className="t-eyebrow text-edit-muted">Admin</span>
          </div>
          <button
            onClick={() => { localStorage.removeItem('token'); navigate('/') }}
            className="t-caption text-edit-muted hover:text-edit-ink transition-colors
                       inline-flex items-center gap-1.5"
          >
            <LogOut size={12} strokeWidth={1.5} />
            로그아웃
          </button>
        </div>
      </header>

      <main
        className="px-6 py-8 max-w-5xl mx-auto transition-[padding] duration-200"
        style={{ paddingRight: selectedUser ? '344px' : '24px' }}
      >
        {/* Stats — paper paragraph */}
        {stats && (
          <div className="grid grid-cols-5 border-y border-edit-line mb-12">
            {[
              { label: 'Total Users', value: stats.total_users },
              { label: 'Verified',    value: stats.verified_users },
              { label: 'Projects',    value: stats.total_projects },
              { label: 'Photos (DB)', value: stats.total_photos },
              { label: 'Notes',       value: stats.total_notes },
            ].map((s, i) => (
              <div key={s.label} className={`px-6 py-6 ${i > 0 ? 'border-l border-edit-line' : ''}`}>
                <p className="t-eyebrow text-edit-muted mb-2">{s.label}</p>
                <p className="font-serif text-h1 font-normal tracking-tight">
                  {s.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        <ActivityStatsSection />
        <ExternalStatsSection />
        <OrphanSection />
        <EmailTemplatesSection />

        <InfraCostsSection />

        <ProjectDuplicateSection />

        {/* Send Notice */}
        <div className="mb-8">
          {!showNotify ? (
            <button
              onClick={() => setShowNotify(true)}
              className="inline-flex items-center gap-2 t-caption px-4 py-2
                         border border-edit-line rounded-[1px] hover:bg-edit-paper transition-colors"
            >
              <Megaphone size={12} strokeWidth={1.5} />
              공지 발송
            </button>
          ) : (
            <div className="border border-edit-line rounded-[1px] p-5 max-w-xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Megaphone size={14} strokeWidth={1.5} className="text-edit-muted" />
                  <p className="font-serif text-h3 font-normal tracking-tight text-edit-ink">
                    공지 발송
                  </p>
                </div>
                <button
                  onClick={() => { setShowNotify(false); setNotifyResult(null) }}
                  className="text-edit-muted hover:text-edit-ink transition-colors"
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="t-eyebrow text-edit-muted mb-1">Subject</p>
                  <input
                    type="text"
                    placeholder="제목을 입력하세요"
                    value={notifySubject}
                    onChange={e => setNotifySubject(e.target.value)}
                    className="w-full font-serif text-body bg-transparent border-0 border-b
                               border-edit-line focus:border-edit-ink focus:outline-none py-2
                               placeholder:text-edit-faint transition-colors"
                  />
                </div>
                <div>
                  <p className="t-eyebrow text-edit-muted mb-1">Content</p>
                  <textarea
                    placeholder="본문을 입력하세요 (줄바꿈 지원)"
                    value={notifyContent}
                    onChange={e => setNotifyContent(e.target.value)}
                    rows={5}
                    className="w-full font-serif text-body bg-transparent border-0 border-b
                               border-edit-line focus:border-edit-ink focus:outline-none py-2
                               placeholder:text-edit-faint resize-none transition-colors"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="verifiedOnly"
                    checked={notifyVerifiedOnly}
                    onChange={e => setNotifyVerifiedOnly(e.target.checked)}
                    className="accent-current"
                  />
                  <span className="t-caption text-edit-muted">
                    Verified users only ({users.filter(u => u.is_verified).length}명)
                  </span>
                </label>
              </div>

              {notifyResult && (
                <p className={`t-caption mt-4 inline-flex items-center gap-1.5
                               ${notifyResult.ok ? 'text-edit-warning' : 'text-edit-danger'}`}>
                  {notifyResult.ok
                    ? <CheckCircle2 size={11} strokeWidth={1.5} />
                    : <XCircle size={11} strokeWidth={1.5} />}
                  {notifyResult.message}
                </p>
              )}

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setConfirmNotifyOpen(true)}
                  disabled={notifying || !notifySubject.trim() || !notifyContent.trim()}
                  className="inline-flex items-center gap-2 t-caption px-5 py-2.5
                             bg-edit-ink text-edit-paper rounded-[1px]
                             hover:bg-edit-ink/85 disabled:opacity-40 transition-colors"
                >
                  {notifying && <Spinner size={11} />}
                  {notifying ? 'Sending...' : 'Send'}
                </button>
                <button
                  onClick={() => { setShowNotify(false); setNotifyResult(null) }}
                  className="t-caption px-4 py-2.5 border border-edit-line rounded-[1px]
                             hover:bg-edit-paper transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Users */}
        <div>
          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-4 px-4 py-3
                            bg-edit-paper-2 border-y border-edit-line t-caption">
              <span className="text-edit-ink">{selectedIds.size}명 선택됨</span>
              <span className="border-l border-edit-line h-4 self-center" />

              <div className="flex gap-1">
                {PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => handleBulkApply({ photo_limit: preset.photo_limit, project_limit: preset.project_limit })}
                    disabled={bulkApplying}
                    className="px-2.5 py-1 border border-edit-line text-edit-muted
                               hover:text-edit-ink hover:border-edit-ink rounded-[1px]
                               disabled:opacity-40 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <span className="border-l border-edit-line h-4 self-center" />
              <span className="text-edit-muted">직접 입력:</span>

              <div className="flex items-center gap-1.5">
                <span className="text-edit-muted">Photo</span>
                <input
                  type="number"
                  placeholder="—"
                  value={bulkPhotoLimit}
                  onChange={e => setBulkPhotoLimit(e.target.value)}
                  className="w-16 border border-edit-line rounded-[1px] px-2 py-1
                             text-body outline-none focus:border-edit-ink bg-transparent"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-edit-muted">Project</span>
                <input
                  type="number"
                  placeholder="—"
                  value={bulkProjectLimit}
                  onChange={e => setBulkProjectLimit(e.target.value)}
                  className="w-16 border border-edit-line rounded-[1px] px-2 py-1
                             text-body outline-none focus:border-edit-ink bg-transparent"
                />
              </div>
              <button
                onClick={() => handleBulkApply()}
                disabled={bulkApplying || (bulkPhotoLimit === '' && bulkProjectLimit === '')}
                className="px-3 py-1 bg-edit-ink text-edit-paper rounded-[1px]
                           hover:bg-edit-ink/85 disabled:opacity-40 transition-colors"
              >
                {bulkApplying ? '적용 중...' : '적용'}
              </button>

              <span className="border-l border-edit-line h-4 self-center" />
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-edit-muted hover:text-edit-ink transition-colors"
              >
                선택 해제
              </button>
            </div>
          )}

          {/* Search + Sort */}
          <div className="flex items-center gap-4 mb-4">
            <input
              type="text"
              placeholder="Search by email..."
              value={searchEmail}
              onChange={e => setSearchEmail(e.target.value)}
              className="border border-edit-line rounded-[1px] px-3 py-1.5
                         text-body outline-none focus:border-edit-ink w-64 bg-transparent"
            />
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="t-caption border border-edit-line rounded-[1px] px-3 py-1.5
                         hover:bg-edit-paper transition-colors"
            >
              Joined {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
            <span className="t-caption text-edit-faint ml-auto">{filteredUsers.length} users</span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-edit-line text-left">
                  <th className="py-2 pr-3 w-8 font-normal">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="accent-current"
                    />
                  </th>
                  <th className="py-2 pr-4 t-eyebrow text-edit-muted font-normal">Email</th>
                  <th className="py-2 pr-4 t-eyebrow text-edit-muted font-normal">Verified</th>
                  <th className="py-2 pr-4 t-eyebrow text-edit-muted font-normal">Usage</th>
                  <th className="py-2 pr-4 t-eyebrow text-edit-muted font-normal">Joined</th>
                  <th className="py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr
                    key={user.id}
                    className={`border-b border-edit-line hover:bg-edit-paper/50 transition-colors
                                ${selectedUser?.id === user.id ? 'bg-edit-paper' : ''}`}
                  >
                    <td className="py-3 pr-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(user.id)}
                        onChange={() => toggleSelectOne(user.id)}
                        className="accent-current"
                      />
                    </td>
                    <td className="py-3 pr-4 font-serif text-body text-edit-ink">{user.email}</td>
                    <td className="py-3 pr-4">
                      {user.is_verified
                        ? <CheckCircle2 size={13} strokeWidth={1.5} className="text-edit-warning" />
                        : <XCircle size={13} strokeWidth={1.5} className="text-edit-danger" />}
                    </td>
                    <td className="py-3 pr-4 t-caption text-edit-muted whitespace-nowrap">
                      프로젝트 {user.project_count} / {user.project_limit}
                      &nbsp;·&nbsp;
                      사진 {user.photo_count} / {user.photo_limit}
                    </td>
                    <td className="py-3 pr-4 t-caption text-edit-faint">
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-3">
                      <button
                        data-edit-btn
                        onClick={() => handleEditUser(user)}
                        className="p-1.5 rounded-[1px] text-edit-muted hover:text-edit-ink
                                   hover:bg-edit-paper transition-colors"
                      >
                        <Pencil size={13} strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Side Panel */}
      <UserEditPanel
        user={selectedUser}
        values={panelValues}
        onChange={setPanelValues}
        saving={panelSaving}
        onSave={handlePanelSave}
        onDelete={handlePanelDelete}
        onClose={() => setSelectedUser(null)}
        panelRef={panelRef}
      />

      {/* Confirm: Send Notice */}
      <ConfirmDialog
        open={confirmNotifyOpen}
        onClose={() => setConfirmNotifyOpen(false)}
        onConfirm={async () => { setConfirmNotifyOpen(false); await handleNotify() }}
        title="공지를 발송할까요?"
        description={`${recipientCount}명의 사용자에게 이메일을 발송합니다.`}
        confirmLabel="발송"
      />
    </div>
  )
}
