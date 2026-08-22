/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488', // Primary Healthcare Teal
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
          950: '#042F2E',
        },
        medical: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7', // Secondary Medical Blue
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
        },
        surface: {
          bg: 'var(--color-surface-bg)',
          card: 'var(--color-surface-card)',
          elevated: 'var(--color-surface-elevated)',
          muted: 'var(--color-surface-muted)',
          border: 'var(--color-surface-border)',
        },
        content: {
          primary: 'var(--color-content-primary)',
          secondary: 'var(--color-content-secondary)',
          muted: 'var(--color-content-muted)',
          disabled: 'var(--color-content-disabled)',
        },
        risk: {
          low: {
            text: '#15803D',
            bg: '#F0FDF4',
            border: '#BBF7D0',
          },
          moderate: {
            text: '#D97706',
            bg: '#FFFBEB',
            border: '#FDE68A',
          },
          high: {
            text: '#C2410C',
            bg: '#FFF7ED',
            border: '#FFEDD5',
          },
          emergency: {
            text: '#B91C1C',
            bg: '#FEF2F2',
            border: '#FCA5A5',
          },
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        'display': ['2.25rem', { lineHeight: '2.75rem', fontWeight: '700' }],
        'h1': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700' }],
        'h2': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        'h3': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'h4': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '400' }],
        'body': ['1rem', { lineHeight: '1.625rem', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.375rem', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.125rem', fontWeight: '400' }],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'elevated': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      },
      maxWidth: {
        'content': '1280px',
      },
      borderRadius: {
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
      },
    },
  },
  plugins: [],
};
