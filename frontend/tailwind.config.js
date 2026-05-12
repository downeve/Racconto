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
        // gray를 stone으로 remapping — 기존 bg-gray-* 클래스가 stone 톤으로 바뀜
        gray: colors.stone,
        canvas:    '#F4EFE7',           // 종이 (메인 배경)
        'canvas-2': '#FFFFFF',          // 모달, 카드
        'canvas-3': '#292524',          // Primary 버튼 Hover, warm stone-800
        'canvas-4': '#E7E0D7',          // Secondary 버튼 Hover, warm-stone-200
        'secondary-border': '#D6D3D1',  // Secondary 버튼 Hover border, warm-stone-300
        card: '#FFFFFF',                // 하위 호환용 (canvas-2 와 동일)
        ink:       o('oklch(0.18 0.012 60)'),  // 제목 및 강조
        'ink-2':   o('oklch(0.28 0.012 60)'),  // 본문
        muted:     o('oklch(0.55 0.012 65)'),  // 보조 텍스트
        faint:     o('oklch(0.78 0.010 75)'),  // 메타, placeholder
        hair:      o('oklch(0.90 0.010 75)'),  // 구분선, 보더
        accent:    o('oklch(0.55 0.08 55)'),   // 포커스, 링크 Hover
        lightbox: colors.stone[950],           // 라이트박스 배경색 (하위 호환)
        // 다크 모드 — warm taupe
        'd-bg':      o('oklch(0.18 0.012 60)'),  // 다크 메인 배경
        'd-surface': o('oklch(0.22 0.012 60)'),  // 다크 카드/패널
        'd-line':    o('oklch(0.32 0.010 70)'),  // 다크 구분선
        'd-faint':   o('oklch(0.55 0.008 75)'),  // 다크 microcopy
        'd-soft':    o('oklch(0.78 0.010 75)'),  // 다크 secondary body
        'd-hair':    o('oklch(0.94 0.008 75)'),  // 다크 body
        // 편집기 전용 의미 토큰 (ProjectStory / StoryBlocks)
        'edit-canvas':      '#F4EFE7',                    // 편집 페이지 배경 (canvas)
        'edit-canvas-2':    o('oklch(0.94 0.008 75)'),   // canvas 위 hover
        'edit-paper':       '#FFFFFF',                    // 편집 sheet (순백)
        'edit-paper-2':     o('oklch(0.975 0.004 75)'),  // sheet 위 hover
        'edit-line':        o('oklch(0.88 0.008 75)'),
        'edit-line-strong': o('oklch(0.78 0.010 75)'),
        'edit-ink':         o('oklch(0.22 0.012 60)'),
        'edit-muted':       o('oklch(0.55 0.012 65)'),
        'edit-faint':       o('oklch(0.72 0.010 75)'),
        'edit-accent':      o('oklch(0.45 0.10 240)'),
        'edit-danger':      o('oklch(0.50 0.15 25)'),
        'edit-warning':     o('oklch(0.62 0.13 75)'),
        'edit-drop':        o('oklch(0.95 0.04 240)'),

        // 컬러 라벨 5종 (동일 채도/명도 곡선)
        'label-red':        o('oklch(0.62 0.16 25)'),
        'label-yellow':     o('oklch(0.78 0.13 85)'),
        'label-green':      o('oklch(0.65 0.13 150)'),
        'label-blue':       o('oklch(0.55 0.12 240)'),
        'label-purple':     o('oklch(0.55 0.12 300)'),
        // 하위 호환 (기존 PublicPortfolio 다크 헬퍼에서 사용)
        'card-cover': colors.stone[800],
        'card-surface': colors.stone[900],
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
        // 콘텐츠/에디토리얼 — 포트폴리오 본문, 제목
        serif: ['"Noto Serif KR"', 'Georgia', 'serif'],
        
        // UI — 메뉴, 버튼, 폼
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 
              '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}