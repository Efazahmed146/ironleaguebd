import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

/**
 * IronLeague BD design tokens
 *  - Colors are CSS variables (app/globals.css) so the whole UI switches between dark and light.
 *  - iron  : zinc scale (page + surfaces). In light mode the scale is inverted.
 *  - volt  : electric lime (primary accent: PRs, verified, CTAs)
 *  - blood : crimson (secondary accent: elite tiers, warnings, heat)
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        iron: {
          50: "rgb(var(--iron-50) / <alpha-value>)",
          100: "rgb(var(--iron-100) / <alpha-value>)",
          200: "rgb(var(--iron-200) / <alpha-value>)",
          300: "rgb(var(--iron-300) / <alpha-value>)",
          400: "rgb(var(--iron-400) / <alpha-value>)",
          500: "rgb(var(--iron-500) / <alpha-value>)",
          600: "rgb(var(--iron-600) / <alpha-value>)",
          700: "rgb(var(--iron-700) / <alpha-value>)",
          800: "rgb(var(--iron-800) / <alpha-value>)",
          850: "rgb(var(--iron-850) / <alpha-value>)",
          900: "rgb(var(--iron-900) / <alpha-value>)",
          950: "rgb(var(--iron-950) / <alpha-value>)",
        },
        volt: {
          50: "rgb(var(--volt-50) / <alpha-value>)",
          100: "rgb(var(--volt-100) / <alpha-value>)",
          200: "rgb(var(--volt-200) / <alpha-value>)",
          300: "rgb(var(--volt-300) / <alpha-value>)",
          400: "rgb(var(--volt-400) / <alpha-value>)",
          500: "rgb(var(--volt-500) / <alpha-value>)",
          600: "rgb(var(--volt-600) / <alpha-value>)",
          700: "rgb(var(--volt-700) / <alpha-value>)",
          800: "rgb(var(--volt-800) / <alpha-value>)",
          900: "rgb(var(--volt-900) / <alpha-value>)",
        },
        blood: {
          300: "rgb(var(--blood-300) / <alpha-value>)",
          400: "rgb(var(--blood-400) / <alpha-value>)",
          500: "rgb(var(--blood-500) / <alpha-value>)",
          600: "rgb(var(--blood-600) / <alpha-value>)",
          700: "rgb(var(--blood-700) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Impact", ...defaultTheme.fontFamily.sans],
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
      },
      letterSpacing: {
        stencil: "0.18em",
      },
      boxShadow: {
        "glow-volt":
          "0 0 0 1px rgb(var(--glow) / 0.45), 0 0 36px -6px rgb(var(--glow) / 0.4)",
        "glow-blood":
          "0 0 0 1px rgb(var(--blood-500) / 0.45), 0 0 36px -6px rgb(var(--blood-500) / 0.4)",
      },
      backgroundImage: {
        "grid-iron":
          "linear-gradient(to right, rgb(var(--grid) / var(--grid-a)) 1px, transparent 1px), linear-gradient(to bottom, rgb(var(--grid) / var(--grid-a)) 1px, transparent 1px)",
        "hero-glow":
          "radial-gradient(60% 50% at 15% 0%, rgb(var(--glow) / var(--hero-a)), transparent 70%), radial-gradient(45% 40% at 95% 10%, rgb(var(--blood-500) / var(--hero-a)), transparent 70%)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        navbar: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(300%)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        rise: "rise 0.45s ease-out both",
        "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
