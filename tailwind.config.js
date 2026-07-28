/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identidade Noite Goiana
        ink: {
          950: '#0A0510',
          900: '#120B1E',
          800: '#1B1129',
          700: '#261638',
        },
        violet: {
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#6D28D9', // roxo principal do briefing
          700: '#5B21B6',
        },
        neon: {
          DEFAULT: '#C084FC',
          soft: '#E9D5FF',
        },
      },
      fontFamily: {
        display: ['"Clash Display"', '"Sora"', 'sans-serif'],
        body: ['"Sora"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'grid-glow':
          'radial-gradient(circle at 20% 20%, rgba(109,40,217,0.35), transparent 45%), radial-gradient(circle at 80% 0%, rgba(192,132,252,0.25), transparent 40%)',
        'cta-gradient': 'linear-gradient(90deg, #6D28D9 0%, #A855F7 50%, #C084FC 100%)',
      },
      boxShadow: {
        neon: '0 0 0 1px rgba(192,132,252,0.25), 0 8px 40px -8px rgba(109,40,217,0.55)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
