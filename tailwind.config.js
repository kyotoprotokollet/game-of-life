/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        softPulse: {
          "0%, 100%": {
            boxShadow:
              "0 0 5px theme(colors.pink.500), 0 0 10px theme(colors.pink.600 / 0.7)",
          },
          "50%": {
            boxShadow:
              "0 0 10px theme(colors.pink.400), 0 0 15px theme(colors.pink.500 / 0.7)",
          },
        },
        cellGlowPulse: {
          "0%, 100%": { opacity: "0.7" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        softPulse: "softPulse .5s ease-in-out infinite",
        cellGlowPulse: "cellGlowPulse .5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
