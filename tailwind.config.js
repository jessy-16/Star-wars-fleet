/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'sw-yellow': '#FFE81F',
        'sw-dark': '#0a0a0f',
        'sw-gray': '#1a1a2e',
      }
    },
  },
  plugins: [],
}