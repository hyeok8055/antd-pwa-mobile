/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Vite + React 프로젝트의 파일 경로
  ],
  theme: {
    extend: {
      colors: {
        bg1: {
          DEFAULT: "#FFFFFF", // bg1.color
        },
        jh: {
          emphasize: "#5FDD9D", // jh.emphasize
          red: "#DA6662", // jh.red
          black: "#000000", // jh.black
          white: "#FFFFFF", // jh.white
        },
        hover: {
          DEFAULT: "#FFE8C8", // hover.color
        },
      },
    },
  },
  plugins: [],
}
