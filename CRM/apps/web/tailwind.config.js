/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0284c7', // Slate Blue Real Estate Accent
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
          950: '#041c2c',
        },
        navy: {
          800: '#1e293b',
          900: '#0f172a',
          950: '#0b132b',
        },
        gold: {
          300: '#fde68a',
          400: '#fbbf24',
          500: '#d97706',
          600: '#b45309',
          700: '#92400e',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'card': '0 4px 20px -4px rgba(15, 23, 42, 0.05)',
        'card-hover': '0 12px 30px -6px rgba(15, 23, 42, 0.08)',
        'glow-sky': '0 0 24px -4px rgba(2, 132, 199, 0.25)',
        'glow-emerald': '0 0 24px -4px rgba(16, 185, 129, 0.25)',
        'glow-amber': '0 0 24px -4px rgba(217, 119, 6, 0.25)',
      },
    },
  },
  plugins: [],
};
