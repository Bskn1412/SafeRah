export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-main": "linear-gradient(135deg,#6366f1,#a855f7,#ec4899)",
        "gradient-card": "linear-gradient(135deg,#1e1b4b,#312e81)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        fadeDown: {
          "0%": { opacity: 0, transform: "translateY(-20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        }
      },
      animation: {
        fadeUp: "fadeUp 0.9s ease-out forwards",
        fadeDown: "fadeDown 0.9s ease-out forwards",
      }
    },
  },
  plugins: [],
};
