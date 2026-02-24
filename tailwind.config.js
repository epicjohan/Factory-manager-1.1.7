/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./App.tsx"
  ],
  darkMode: 'class', // Make sure it respects class-based dark mode (as typical for this app)
  theme: {
    extend: {
      colors: {
        // Modernized slate palette (Linear/Vercel sleek style)
        slate: {
          50: '#fafafa', // highly sleek very-light grey/white
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#27272a',
          800: '#18181b', // sleek dark card bg
          900: '#09090b', // sleek app bg (OLED-ish)
          950: '#000000',
        },
        // Modern crisp digital blue (Stripe inspired)
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#8bb4f6',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // crisp primary
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Make emerald a richer, more neon-ish modern green
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        }
      }
    },
  },
  plugins: [],
}

