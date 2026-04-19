/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1A5276',
        accent: '#2980B9',
        'accent-lt': '#D6EAF8',
        cta: '#E67E22',
        'cta-dark': '#CA6F1E',
        muted: '#777777',
        'bg-alt': '#F4F6F8',
        border: '#DDE3E9',
        success: '#27AE60',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        container: '1160px',
      },
    },
  },
  plugins: [],
}
