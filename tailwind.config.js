/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1324",
        mist: "#e8edf8",
        panel: "#121b2f",
        accent: "#4ade80",
        warm: "#f59e0b"
      },
      boxShadow: {
        glow: "0 12px 40px rgba(25, 53, 130, 0.28)"
      }
    }
  },
  plugins: []
};
