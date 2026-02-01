/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0A0724",
        gold: "#E2D243",
        "light-grey": "#F2F2F2",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
