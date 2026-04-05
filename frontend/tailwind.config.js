/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  // We use dark-first design; add 'dark' class to html for global dark
  safelist: [
    // Rarity colors must not be purged
    'border-gray-700', 'border-emerald-500', 'border-blue-500', 'border-purple-500', 'border-yellow-400',
    'shadow-emerald-500/40', 'shadow-blue-500/40', 'shadow-purple-500/40', 'shadow-yellow-400/50',
    'bg-gray-700', 'text-gray-300', 'bg-emerald-900', 'text-emerald-300',
    'bg-blue-900', 'text-blue-300', 'bg-purple-900', 'text-purple-300',
    'bg-yellow-900', 'text-yellow-300',
  ],
  theme: {
    extend: {
      height: {
        '85': '21.25rem',
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
