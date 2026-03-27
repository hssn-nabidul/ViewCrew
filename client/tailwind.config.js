/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./main.js",
    "./ui/**/*.js",
    "./players/**/*.js",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "primary": "#E50914", // ViewCrew Red
        "on-primary": "#FFFFFF",
        "background": "#000000", // True Black
        "surface": "#121212", // Charcoal Gray
        "on-surface": "#FFFFFF",
        "on-surface-variant": "#B3B3B3",
        "outline": "#333333",
        "surface-container": "#181818",
        "surface-container-high": "#242424",
        "tertiary": "#4EDE93", // Success/Speaking indicator
      },
      fontFamily: {
        "headline": ["Inter", "sans-serif"],
        "body": ["Inter", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "1rem",
        "full": "9999px"
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
