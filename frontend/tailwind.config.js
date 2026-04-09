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
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}