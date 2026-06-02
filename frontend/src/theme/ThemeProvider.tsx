/**
 * 다크모드 단일 진실 (Dark Mode STEP 2)
 *
 * - pref       : 사용자 선택. 'system' | 'light' | 'dark'. 기본 'system'.
 * - effective  : 실제 적용. 'light' | 'dark'. pref==='system' 일 때 matchMedia 로 해석.
 * - DOM 반영   : <html data-theme={effective}>. (FOUC 차단 스크립트가 index.html 에서
 *                먼저 칠하고, 이 Provider 가 React 마운트 시점에 동기화)
 * - 시스템 라이브 반응: pref==='system' 일 때 matchMedia('(prefers-color-scheme: dark)')
 *                의 change 리스너로 effective 재계산. 명시값(light/dark)이면 무시.
 * - 저장: localStorage('theme_pref'). STEP 3 에서 로그인 사용자 계정 동기화 추가 예정.
 */

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react'
import axios from 'axios'

export type ThemePref = 'system' | 'light' | 'dark'
export type ThemeEffective = 'light' | 'dark'

interface ThemeContextValue {
  pref: ThemePref
  setPref: (next: ThemePref) => void
  effective: ThemeEffective
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'theme_pref'
const API = import.meta.env.VITE_API_URL

const isValidPref = (v: unknown): v is ThemePref =>
  v === 'system' || v === 'light' || v === 'dark'

const hasAuthToken = (): boolean => {
  try { return !!localStorage.getItem('token') } catch { return false }
}

const readSystemEffective = (): ThemeEffective => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const resolveEffective = (pref: ThemePref): ThemeEffective =>
  pref === 'system' ? readSystemEffective() : pref

const applyToDom = (effective: ThemeEffective) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', effective)
  }
}

const readStoredPref = (): ThemePref => {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch { /* localStorage 접근 불가 */ }
  return 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(readStoredPref)
  const [effective, setEffective] = useState<ThemeEffective>(() => resolveEffective(readStoredPref()))
  // 마운트 시점 동기화가 한 번만 일어나도록 보호.
  const serverSyncedRef = useRef(false)

  // pref 변경 시 effective 재계산 + DOM 반영
  useEffect(() => {
    const next = resolveEffective(pref)
    setEffective(next)
    applyToDom(next)
  }, [pref])

  // pref==='system' 일 때만 OS 변화에 라이브로 반응
  useEffect(() => {
    if (pref !== 'system') return
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const next: ThemeEffective = mq.matches ? 'dark' : 'light'
      setEffective(next)
      applyToDom(next)
    }
    // 브라우저 호환 — Safari <14 는 addListener 만 지원하지만 우리 타깃은 modern.
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [pref])

  const setPref = useCallback((next: ThemePref) => {
    setPrefState(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* 저장 실패 무시 */ }
    // 로그인 사용자면 서버에도 PUT (계정 동기화 — 기기 간 유지). 실패는 무시(로컬은 이미 반영).
    if (hasAuthToken() && API) {
      axios.put(`${API}/settings/theme_pref`, { value: next }).catch(() => { /* 무시 */ })
    }
    // DOM 반영은 useEffect 로 처리 (이중 호출 방지)
  }, [])

  // 마운트 시 서버 동기화 — 로그인 사용자라면:
  //   서버에 theme_pref 가 있으면 그 값을 채택(localStorage 덮어씀, 기기 간 유지).
  //   없으면 현재 localStorage 값을 서버로 push-up(첫 로그인 기기의 선호 보존).
  useEffect(() => {
    if (serverSyncedRef.current) return
    if (!hasAuthToken() || !API) return
    serverSyncedRef.current = true
    axios.get<Record<string, string>>(`${API}/settings/`).then(({ data }) => {
      const server = data?.theme_pref
      if (isValidPref(server)) {
        if (server !== pref) {
          setPrefState(server)
          try { localStorage.setItem(STORAGE_KEY, server) } catch { /* 무시 */ }
        }
      } else {
        // 서버에 값 없음 → 현재 로컬 값을 서버에 저장
        axios.put(`${API}/settings/theme_pref`, { value: pref }).catch(() => { /* 무시 */ })
      }
    }).catch(() => { /* 무시 */ })
    // pref 는 의존성에 넣지 않음 — push-up 은 마운트 시점의 값 한 번만.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<ThemeContextValue>(() => ({ pref, setPref, effective }), [pref, setPref, effective])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
  return ctx
}
