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
          navy: '#04302f',
          blue: '#00857f',
          cyan: '#00cec8',
          lightcyan: '#ddfbf9',
          yellow: '#fbbf24',
          gold: '#f59e0b',
          red: '#ef4444',
          green: '#10b981',
          amber: '#f59e0b',
          surface: '#eef7f6',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(4,48,47,0.04), 0 8px 24px rgba(4,48,47,0.06)',
        'card-hover': '0 12px 36px rgba(4,48,47,0.12)',
        pln: '0 1px 3px rgba(0,0,0,0.08), 0 4px 14px rgba(0,133,127,0.08)',
        'pln-hover': '0 10px 30px rgba(0,133,127,0.14)',
        'pln-glow': '0 0 0 4px rgba(0,206,200,0.15)',
        'pln-cta': '0 8px 24px rgba(0,206,200,0.35)',
      },
      backgroundImage: {
        'pln-gradient': 'linear-gradient(135deg, #04302f 0%, #00857f 100%)',
        'pln-brand': 'linear-gradient(135deg, #04302f 0%, #053b3a 100%)',
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