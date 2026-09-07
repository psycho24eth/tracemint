/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#05070d",
        surface: "#0c111d",
        surfaceBorder: "#1e293b",
        brandCyan: "#00f2fe",
        brandViolet: "#7928ca",
        brandLime: "#10b981",
        accentNavy: "#0a0f1d",
      },
      fontFamily: {
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
