import colors from 'tailwindcss/colors'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // gray를 stone으로 remapping — 기존 bg-gray-* 클래스가 stone 톤으로 바뀜
        gray: colors.stone,
        canvas: '#F7F4F0',      //메인 배경
        'canvas-2': '#EFEAE3',  //Hover, subtle panel
        'canvas-3': '#292524',    //Primary 버튼 Hover 적용, warm stone-800 
        'canvas-4': '#E7E0D7',  //Secondary 버튼 Hover warm-stone-200
        'secondary-border': "#D6D3D1", //Secondary 버튼 Hover border, warm-stone-300
        card: '#FFFFFF',        //모달, 카드
        ink: colors.stone[900],       //제목 및 강조
        'ink-2': colors.stone[700],   //본문
        muted: colors.stone[500],     //보조텍스트
        faint: colors.stone[400],     //메타, placeholder
        hair: colors.stone[200],      //구분선, 보더
        accent: 'oklch(55% 0.08 55)', //포커스, 링크 Hover(선택)
        lightbox: colors.stone[950], //라이트박스 배경색
      },
      // 🚨 1. 타입 스케일 고정 (폰트크기, 행간, 자간을 한 세트로 등록)
      fontSize: {
        'display': ['4rem',     { lineHeight: '1.05', letterSpacing: '-0.02em' }], // 64
        'h1':      ['2.75rem',  { lineHeight: '1.1',  letterSpacing: '-0.01em' }], // 44
        'h2':      ['1.75rem',  { lineHeight: '1.25' }],                           // 28
        'h3':      ['1.25rem',  { lineHeight: '1.4' }],                            // 20
        'body':    ['1rem',     { lineHeight: '1.6' }],                            // 16 ✨
        'small':   ['0.875rem', { lineHeight: '1.5' }],                             // 14
        'menu':    ['0.8125rem',{ lineHeight: '1.5' }],                                // 13 (사이드바 메뉴용)
        'caption': ['0.75rem',  { lineHeight: '1.4' }],                        // 12 ✨
        'eyebrow': ['0.6875rem',{ lineHeight: '1',    letterSpacing: '0.18em' }],  // 11
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