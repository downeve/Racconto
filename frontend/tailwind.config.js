import colors from 'tailwindcss/colors'

// oklch 색상에 Tailwind /opacity 수식어 지원 추가
const o = (c) => ({ opacityValue }) =>
  opacityValue !== undefined ? c.replace(')', ` / ${opacityValue})`) : c

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
        canvas:    o('oklch(0.928 0.007 88.6)'),  // 갤러리 중성 배경 (was 따뜻 크림)
        'canvas-2': o('oklch(0.958 0.005 95.1)'), // 모달·카드 (중성 off-white)
        'canvas-3': o('oklch(0.945 0.005 90)'),   // 중간 밴드 (미사용, 중성)
        'canvas-4': o('oklch(0.905 0.007 88)'),   // Secondary hover, 한 단계 어두운 면
        'secondary-border': '#D6D3D1',  // Secondary 버튼 Hover border
        card: o('oklch(0.976 0.004 91.4)'),       // 카드·시트 (중성 off-white)
        ink:       o('oklch(0.218 0.004 84.6)'),  // 제목 및 강조 (중성)
        'ink-2':   o('oklch(0.342 0.006 78.3)'),  // 본문 (중성)
        muted:     o('oklch(0.531 0.008 88.7)'),  // 보조 텍스트 (AA canvas ≈5.3:1)
        faint:     o('oklch(0.735 0.009 91.5)'),  // 메타·placeholder 장식 (중성)
        hair:      o('oklch(0.90 0.006 88)'),      // 구분선 (hue 중성, L 유지)
        accent:    o('oklch(0.50 0.085 55)'),     // 테라코타 — 변경 금지 (행동/상태 전용)
        'accent-soft': o('oklch(0.933 0.012 59.6)'), // 활성 필터칩 틴트 배경
        // (dead 'lightbox' 색 토큰 제거 — scrim 으로 대체. z-index 'lightbox' 는 별개로 유지)
        // 다크 모드 — warm taupe
        'd-bg':      o('oklch(0.196 0.003 67.7)'), // 다크 중성 배경 (was warm)
        'd-surface': o('oklch(0.231 0.004 84.6)'), // 다크 카드/패널 (중성)
        'd-line':    o('oklch(0.325 0.009 88.7)'), // 다크 구분선 (중성)
        'd-faint':   o('oklch(0.651 0.009 84.6)'), // 다크 microcopy (AA d-bg)
        'd-soft':    o('oklch(0.783 0.009 84.6)'), // 다크 secondary body (중성)
        'd-hair':    o('oklch(0.94 0.005 88)'),    // 다크 body (hue 중성)
        // 편집기 전용 의미 토큰 (ProjectStory / StoryBlocks)
        'edit-canvas':      o('oklch(0.928 0.007 88.6)'), // 편집 배경 (= canvas 중성)
        'edit-canvas-2':    o('oklch(0.945 0.005 90)'),   // canvas 위 hover (중성)
        'edit-paper':       o('oklch(0.976 0.004 91.4)'), // 편집 sheet (= card 중성)
        'edit-paper-2':     o('oklch(0.982 0.003 91)'),   // sheet 위 hover (중성)
        'edit-line':        o('oklch(0.88 0.006 88)'),    // hue 중성, L 유지
        'edit-line-strong': o('oklch(0.78 0.007 88)'),
        'edit-ink':         o('oklch(0.218 0.004 84.6)'), // = ink 중성
        'edit-muted':       o('oklch(0.531 0.008 88.7)'), // = muted 중성
        'edit-faint':       o('oklch(0.72 0.007 90)'),    // hue 중성, L 유지
        'edit-accent':      o('oklch(0.50 0.085 55)'),  // = warm accent (쿨블루 통일)
        'edit-danger':      o('oklch(0.50 0.15 25)'),
        'edit-warning':     o('oklch(0.62 0.13 75)'),
        'edit-drop':        o('oklch(0.95 0.03 55)'),   // warm 드롭 틴트

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
        'd-accent':  o('oklch(0.669 0.094 54.3)'),  // 다크 전용 warm accent (유지·밝게)
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