/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E5FBF',
          hover: '#184E9E',
          light: '#EAF2FF',
          dark: '#133D7C',
        },
        navy: {
          DEFAULT: '#1A1A2E',
          muted: '#64748B',
          dim: '#94A3B8',
          border: '#E2E8F0',
        },
        status: {
          success: '#10B981',
          'success-bg': '#ECFDF5',
          warning: '#F59E0B',
          'warning-bg': '#FEF3C7',
          danger: '#EF4444',
          'danger-bg': '#FEF2F2',
          info: '#3B82F6',
          'info-bg': '#EFF6FF',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        drawer: '-4px 0 24px rgba(0, 0, 0, 0.12)',
        subtle: '0 2px 8px rgba(30, 95, 191, 0.08)',
      }
    },
  },
  plugins: [],
}
