/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f172a',
        card: '#1e293b',
        primary: '#6366f1',
        secondary: '#22d3ee',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        'text-main': '#f1f5f9',
        'text-secondary': '#94a3b8',
      },
    },
  },
  plugins: [],
}
