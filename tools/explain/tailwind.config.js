/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#1A5276',
          blue: '#2980B9',
          orange: '#E67E22',
        },
        severity: {
          critical: '#E74C3C',
          warning: '#E67E22',
          good: '#27AE60',
          optimal: '#2ECC71',
          info: '#3498DB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
