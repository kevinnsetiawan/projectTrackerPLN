/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        pln: {
          navy: '#0b1f3a',
          blue: '#06336b',
          cyan: '#06b6d4',
          lightcyan: '#e0f2fe',
          yellow: '#fbbf24',
          gold: '#f59e0b',
          red: '#ef4444',
          green: '#10b981',
          amber: '#f59e0b',
          surface: '#eef2f7',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,31,58,0.04), 0 8px 24px rgba(11,31,58,0.06)',
        'card-hover': '0 12px 36px rgba(11,31,58,0.12)',
        pln: '0 1px 3px rgba(0,0,0,0.08), 0 4px 14px rgba(6,51,107,0.06)',
        'pln-hover': '0 10px 30px rgba(6,51,107,0.12)',
        'pln-glow': '0 0 0 4px rgba(6,182,212,0.12)',
        'pln-cta': '0 8px 24px rgba(6,182,212,0.35)',
      },
      backgroundImage: {
        'pln-gradient': 'linear-gradient(135deg, #06336b 0%, #06b6d4 100%)',
        'pln-brand': 'linear-gradient(135deg, #0b1f3a 0%, #06336b 100%)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'fade-in': 'fade-in 0.6s ease-out both',
      },
    },
  },
  plugins: [],
};