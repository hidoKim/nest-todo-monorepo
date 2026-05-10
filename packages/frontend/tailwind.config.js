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
        yellow: {
          350: "#FFE812",
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
      backgroundImage: {
        "gradient-greenery":
          "linear-gradient(135deg, #e3f0e8 0%, #d4e8de 50%, #c5dfd4 100%)",
        "gradient-accent": "linear-gradient(135deg, #466f56 0%, #38563f 100%)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": {
            transform: "translateY(0px)",
          },
          "50%": {
            transform: "translateY(20px)",
          },
        },
      },
    },
  },
  plugins: [],
};
