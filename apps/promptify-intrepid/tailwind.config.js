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
        // Promptify tokens (pine, emerald, mint, paper, line, ink); the m3 names stay so ported screens inherit them.
        pine: '#103b30', paper: '#f3f6f4', mint: '#e1f4eb', ink: '#15231e', line: '#d6e1dc',
        m3: {
          primary: '#047857', 'on-primary': '#ffffff',
          'primary-container': '#e1f4eb', 'on-primary-container': '#103b30',
          surface: '#f3f6f4', 'surface-container': '#edf3f0',
          'surface-container-low': '#f3f6f4', 'surface-container-high': '#e3ece8',
          'on-surface': '#15231e', 'on-surface-variant': '#56675f',
          outline: '#7f948b', 'outline-variant': '#d6e1dc',
          error: '#b42318', 'error-container': '#fde8e6',
        },
        brand: {
          emerald: '#047857', amber: '#a35208',
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
        sans: ['Be Vietnam Pro', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Be Vietnam Pro', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}
