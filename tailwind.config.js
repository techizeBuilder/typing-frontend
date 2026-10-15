// Tailwind powers the new design. Preflight (Tailwind's global CSS reset) is
// disabled so pages still on the legacy stylesheets render unchanged; an
// equivalent reset scoped to `.nd` containers lives in src/styles/tailwind.css.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0A2E6B',
          900: '#071F49',
          800: '#0A2E6B',
          700: '#0F3A84',
          600: '#14459B',
        },
        primary: {
          DEFAULT: '#0D6EFD',
          600: '#0D6EFD',
          700: '#0B5ED7',
          50: '#EFF6FF',
          100: '#DBEAFE',
        },
        success: '#198754',
        danger: '#DC3545',
        warn: '#FFC107',
        gold: '#FFD700',
        canvas: '#F5F7FA',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        panel: '0 4px 14px rgba(16, 24, 40, 0.06)',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.25' },
        },
      },
      animation: {
        blink: 'blink 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
