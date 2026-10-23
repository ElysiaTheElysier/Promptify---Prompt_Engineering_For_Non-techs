import safelist from './tailwind-safelist.json';
/** @type {import('tailwindcss').Config} */
export default {
  safelist,
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/components/rebuild/review-templates.json",
  ],
  theme: {
    extend: {
      colors: {
        m3: {
          primary: '#047857', 'on-primary': '#ffffff',
          'primary-container': '#d1fae5', 'on-primary-container': '#065f46',
          surface: '#f8fafc', 'surface-container': '#f1f5f9',
          'surface-container-low': '#f1f5f9', 'surface-container-high': '#e2e8f0',
          'on-surface': '#0f172a', 'on-surface-variant': '#475569',
          outline: '#94a3b8', 'outline-variant': '#cbd5e1',
          error: '#ba1a1a', 'error-container': '#ffdad6',
        },
        brand: {
          emerald: '#059669', amber: '#d97706',
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        slate: {
          850: '#151f32',
          950: '#0b1120',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}
