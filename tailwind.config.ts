import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          850: "#0f172a",
          900: "#0b1324",
          950: "#060c18",
        },
        navy: {
          50: "#f0f5fa",
          100: "#e0ebf5",
          200: "#b8d2eb",
          300: "#8ab4dd",
          400: "#4f8bc9",
          500: "#276bb3",
          600: "#1c5493",
          700: "#174477",
          800: "#0d2747",
          900: "#07162c",
          950: "#040d1c",
        },
        teal: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },
        emerald: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
      },
      fontFamily: {
        sans: ["Montserrat", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(7, 22, 44, 0.05), 0 1px 2px -1px rgba(7, 22, 44, 0.05)",
        card: "0 4px 6px -1px rgba(7, 22, 44, 0.06), 0 2px 4px -2px rgba(7, 22, 44, 0.04)",
        elevated: "0 10px 25px -3px rgba(7, 22, 44, 0.1), 0 4px 10px -4px rgba(7, 22, 44, 0.06)",
        glass: "0 8px 32px 0 rgba(7, 22, 44, 0.12)",
        "glass-elevated": "0 12px 40px 0 rgba(0, 0, 0, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
        tealGlow: "0 0 20px -2px rgba(13, 148, 136, 0.3)",
        emeraldGlow: "0 0 24px -2px rgba(16, 185, 129, 0.35)",
        navyGlow: "0 0 20px -2px rgba(7, 22, 44, 0.4)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out forwards",
        "slide-up": "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-in": "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.97)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
