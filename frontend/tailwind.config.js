import colors from 'tailwindcss/colors'

// oklch 색상에 Tailwind /opacity 수식어 지원 추가
const o = (c) => ({ opacityValue }) =>
  opacityValue !== undefined ? c.replace(')', ` / ${opacityValue})`) : c

// 테마 토큰(CSS 변수 채널) → 색. `<alpha-value>` 가 Tailwind opacity 유틸과 호환.
// 변수 값은 "L C H" 세 숫자 채널이어야 함 (index.css 의 --rc-* 정의 참조).
const ch = (v) => `oklch(${v} / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'xl:max-w-6xl',
    'xl:grid-cols-3',
    'xl:col-span-3',
  ],
  theme: {
    extend: {
      colors: {
        // gray·stone 스케일을 중성(neutral)으로 오버라이드 — Gallery Neutral 전환.
        // 기존 *-gray-*/*-stone-* 클래스가 명암 단계는 유지한 채 warm 제거(무채색)됨.
        gray: colors.neutral,
        stone: colors.neutral,
        // 표면·잉크·강조 — index.css 의 --rc-* 변수를 참조 (라이트/다크 자동 스왑).
        // 값을 직접 박지 않고 채널 변수를 ch() 로 감싸 opacity 유틸 호환을 유지.
        canvas:      ch('var(--rc-canvas)'),
        'canvas-2':  ch('var(--rc-canvas-2)'),
        'canvas-3':  ch('var(--rc-canvas-3)'),
        'canvas-4':  ch('var(--rc-canvas-4)'),
        'secondary-border': '#D6D3D1',  // Secondary 버튼 Hover border (raw — STEP 5-B 정리 예정)
        card:        ch('var(--rc-card)'),
        ink:         ch('var(--rc-ink)'),
        'ink-2':     ch('var(--rc-ink-2)'),
        muted:       ch('var(--rc-muted)'),
        faint:       ch('var(--rc-faint)'),
        accent:      ch('var(--rc-accent)'),
        'accent-2':  ch('var(--rc-accent-2)'),
        // alpha 가 변수에 박힌 토큰 — opacity 유틸 미사용 전제 (그래서 ch() 안 씌움)
        'accent-soft': 'var(--rc-accent-soft)',
        hair:          'var(--rc-hair)',
        'hair-strong': 'var(--rc-hair-strong)',
        // (dead 'lightbox' 색 토큰 제거 — scrim 으로 대체. z-index 'lightbox' 는 별개로 유지)
        // (d-* 다크 전용 토큰 retire 완료 — STEP 4·5 에서 전부 [data-theme] 의미 토큰으로 이행)
        // 편집기 전용 의미 토큰 — index.css 의 --rc-edit-* 참조 (라이트/다크 자동 스왑).
        'edit-canvas':      ch('var(--rc-edit-canvas)'),
        'edit-canvas-2':    ch('var(--rc-edit-canvas-2)'),
        'edit-paper':       ch('var(--rc-edit-paper)'),
        'edit-paper-2':     ch('var(--rc-edit-paper-2)'),
        'edit-line':        ch('var(--rc-edit-line)'),
        'edit-line-strong': ch('var(--rc-edit-line-strong)'),
        'edit-ink':         ch('var(--rc-edit-ink)'),
        'edit-muted':       ch('var(--rc-edit-muted)'),
        'edit-faint':       ch('var(--rc-edit-faint)'),
        'edit-accent':      ch('var(--rc-edit-accent)'),
        'edit-danger':      o('oklch(0.50 0.15 25)'),   // 의미 고정색 (테마 무관)
        'edit-warning':     o('oklch(0.62 0.13 75)'),
        'edit-drop':        o('oklch(0.95 0.03 55)'),   // 드롭 틴트 (라이트 기준 — 드물게 노출)

        // 컬러 라벨 5종 (동일 채도/명도 곡선)
        'label-red':        o('oklch(0.62 0.16 25)'),
        'label-yellow':     o('oklch(0.78 0.13 85)'),
        'label-green':      o('oklch(0.65 0.13 150)'),
        'label-blue':       o('oklch(0.55 0.12 240)'),
        'label-purple':     o('oklch(0.55 0.12 300)'),
        // 의미 토큰 (파괴/성공/경고) — 모든 표면 단일 출처
        danger:      o('oklch(0.50 0.15 25)'),   // 파괴적 동작 (= edit-danger)
        ok:          o('oklch(0.55 0.10 150)'),  // 성공/확인
        warn:        o('oklch(0.62 0.13 75)'),   // 경고 (= edit-warning)
        // 인프라 토큰
        placeholder: o('oklch(0.91 0.006 88)'),     // 스켈레톤·이미지 자리 (중성)
        scrim:       'oklch(0.12 0.012 60 / 0.98)', // 라이트박스 배경
        // 상태 뱃지 (bg/fg 쌍) — StatusBadge 전용
        badge: {
          'progress-bg': 'oklch(0.93 0.03 55)',   'progress-fg': 'oklch(0.46 0.09 55)',
          'done-bg':     'oklch(0.93 0.04 150)',  'done-fg':     'oklch(0.42 0.10 150)',
          'pub-bg':      'oklch(0.18 0.012 60)',  'pub-fg':      '#F4EFE7',
          'arch-bg':     '#E7E0D7',               'arch-fg':     'oklch(0.50 0.012 65)',
        },
        // 하위 호환 (기존 PublicPortfolio 다크 헬퍼에서 사용)
        'card-cover': colors.neutral[800],
        'card-surface': colors.neutral[900],
        status: {
          progress:  '#F59E0B',  // amber-500
          completed: '#10B981',  // emerald-500
          published: '#3B82F6',  // blue-500
          archived:  '#D6D3D1',  // stone-300
        },
      },
      // 🚨 1. 타입 스케일 고정 (폰트크기, 행간, 자간을 한 세트로 등록)
      fontSize: {
        'display': ['4rem',      { lineHeight: '1.05', letterSpacing: '-0.02em' }], // 64
        'h1':      ['2.75rem',   { lineHeight: '1.1',  letterSpacing: '-0.01em' }], // 44
        'h2':      ['1.75rem',   { lineHeight: '1.2' }],                            // 28
        'h3':      ['1.125rem',  { lineHeight: '1.4' }],                            // 18
        'body':    ['0.9375rem', { lineHeight: '1.65' }],                           // 15
        'small':   ['0.875rem',  { lineHeight: '1.5' }],                            // 14
        'menu':    ['0.8125rem', { lineHeight: '1.5' }],                            // 13
        'caption': ['0.75rem',   { lineHeight: '1.4' }],                            // 12
        'eyebrow': ['0.6875rem', { lineHeight: '1', letterSpacing: '0.18em', fontFamily: 'mono' }], // 11
      },
      // 🚨 2. 부드러운 전환 효과를 위한 트랜지션 설정
      transitionProperty: {
        'ui': 'background-color, border-color, color, transform, box-shadow',
      },
      transitionDuration: {
        '150': '150ms',
      },
      transitionTimingFunction: {
        'out': 'cubic-bezier(0, 0, 0.2, 1)',
      },
      spacing: {
        'space-xs': '1rem',    // 16px
        'space-sm': '1.5rem',  // 24px
        'space-md': '3rem',    // 48px
        'space-lg': '6rem',    // 96px
        'space-xl': '9rem',    // 144px
        15: '3.75rem',         // 60px — Explore × Portfolio 카드 그리드 gap-y
      },
      boxShadow: {
        // 1. 기본 shadow (shadow 클래스 하나로 통일)
        // 기존의 무거운 그림자들을 대체하기 위해 'DEFAULT'라는 이름을 씁니다.
        'DEFAULT': '0 1px 2px rgba(28, 25, 23, 0.04), 0 8px 24px -12px rgba(28, 25, 23, 0.08)',
        
        // 2. 라이트박스나 강조용 깊은 그림자 (shadow-deep)
        'deep': '0 20px 50px -12px rgba(28, 25, 23, 0.25)',
      },
      // 🚨 모서리 둥기(Radius) 설정을 추가합니다.
      borderRadius: {
        'photo': '0px', // 사진용 (거의 각지게, 필요시 0px로 하셔도 좋습니다)
        'btn': '2px',   // 버튼용
        'card': '3px',  // 카드, 모달, 패널용
        // 뱃지용 'full'은 Tailwind 기본값(rounded-full)이 이미 있으므로 안 적어도 됩니다!
      },
      zIndex: {
        'block-handle':   '10',
        'photo-controls': '20',
        'block-toolbar':  '25',
        'popover':        '40',
        'lightbox':       '45',
        'dragging':       '50',
        'modal':          '60',
      },
      fontFamily: {
        // 콘텐츠/에디토리얼 — Noto Serif KR(비차단 로딩) + 시스템 serif fallback
        serif: ['"Noto Serif KR"', 'Georgia', '"Times New Roman"', 'serif'],

        // UI — Pretendard Variable(dynamic subset CDN) 우선, 시스템 폰트 fallback
        sans: ['"Pretendard Variable"', 'Pretendard', '-apple-system', 'BlinkMacSystemFont',
              '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}