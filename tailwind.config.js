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
          navy: '#06304a',
          blue: '#007ba9',
          cyan: '#00c8e0',
          lightcyan: '#e0f6fb',
          yellow: '#fbbf24',
          gold: '#f59e0b',
          red: '#ef4444',
          green: '#10b981',
          amber: '#f59e0b',
          surface: '#f0f7fb',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(6,48,74,0.04), 0 8px 24px rgba(6,48,74,0.06)',
        'card-hover': '0 12px 36px rgba(6,48,74,0.12)',
        pln: '0 1px 3px rgba(0,0,0,0.08), 0 4px 14px rgba(0,145,194,0.08)',
        'pln-hover': '0 10px 30px rgba(0,145,194,0.14)',
        'pln-glow': '0 0 0 4px rgba(0,200,224,0.15)',
        'pln-cta': '0 8px 24px rgba(0,200,224,0.35)',
      },
      backgroundImage: {
        'pln-gradient': 'linear-gradient(135deg, #06304a 0%, #0091c2 100%)',
        'pln-brand': 'linear-gradient(135deg, #06304a 0%, #083d5c 100%)',
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