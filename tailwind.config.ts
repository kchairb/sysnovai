import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--color-background) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        elevated: "rgb(var(--color-elevated) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        foreground: "rgb(var(--color-foreground) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        accent: {
          50: "#ECFDFF",
          100: "#CFF9FE",
          200: "#A5F1FC",
          300: "#67E4F8",
          400: "#2ED2EA",
          DEFAULT: "#12BFE1",
          600: "#109ABC",
          700: "#127A95",
          800: "#165D72",
          900: "#164E5E",
          hover: "#0FAFD0"
        },
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444"
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.1rem"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34,56,92,0.52), 0 14px 48px rgba(4,9,20,0.58)",
        "glow-accent": "0 0 0 1px rgba(18,191,225,0.45), 0 10px 34px rgba(18,191,225,0.22)"
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at 18% 8%, rgba(18, 191, 225, 0.24), transparent 42%), radial-gradient(circle at 82% 0%, rgba(88, 118, 255, 0.16), transparent 40%)"
      }
    }
  },
  plugins: []
};

export default config;
