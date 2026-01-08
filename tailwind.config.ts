import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s infinite ease-in-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%': { boxShadow: '0 0 0px 0px rgba(255, 255, 255, 0)' },
          '50%': { boxShadow: '0 0 15px 2px rgba(255, 255, 255, 0.1)' },
          '100%': { boxShadow: '0 0 0px 0px rgba(255, 255, 255, 0)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
