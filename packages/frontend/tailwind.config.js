/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        muji: {
          bg: "#e3f0e8",
          panel: "#fafffc",
          line: "#acc1b4",
          text: "#28362d",
          muted: "#475a4e",
          accent: "#466f56",
        },
      },
      fontFamily: {
        notebook: [
          "Noto Serif KR",
          "ui-serif",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif",
        ],
      },
      boxShadow: {
        note: "0 10px 24px rgba(33, 67, 52, 0.07)",
      },
    },
  },
  plugins: [],
};
