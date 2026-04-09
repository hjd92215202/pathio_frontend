import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      animation: {
        shimmer: 'shimmer 2s infinite',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      colors: {
        pathio: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          900: '#134e4a',
        },
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.slate[700]'),
            code: {
              backgroundColor: theme('colors.slate[100]'),
              color: theme('colors.slate[900]'),
              padding: '0.2em 0.4em',
              borderRadius: '0.375rem',
              fontWeight: '600',
              '&::before': { content: 'none' },
              '&::after': { content: 'none' },
            },
            h2: {
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '0.5rem',
              marginTop: '3.5rem',
            },
            blockquote: {
              borderLeftColor: '#14b8a6',
              backgroundColor: '#f8fafc',
              padding: '1rem 1.5rem',
            },
          },
        },
      }),
    },
  },
  plugins: [typography],
};

