/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0E0B1F",
        panel: "#141225",
        panel2: "#1A1730",
        accent: "#8B5CF6",     // violet-500
        accent2: "#EC4899",    // pink-500
        muted: "#B9B6CC",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glow: "0 0 40px rgba(139, 92, 246, 0.30)",
      },
    },
  },
  plugins: [],
};
