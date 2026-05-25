import type { Config } from "tailwindcss";

/**
 * As cores são expostas como variáveis CSS em src/styles/globals.css (suporte
 * a dark mode via [data-theme="dark"]). Aqui só apontamos os utilitários
 * Tailwind para essas vars, deixando o tema 100% controlado por CSS custom
 * properties — sem JS pra trocar paleta.
 */
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-elev": "var(--bg-elev)",
        "bg-subtle": "var(--bg-subtle)",
        "bg-hover": "var(--bg-hover)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        fg: "var(--fg)",
        "fg-muted": "var(--fg-muted)",
        "fg-subtle": "var(--fg-subtle)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          fg: "var(--accent-fg)",
          bg: "var(--accent-bg)",
          br: "var(--accent-border)",
        },
        success: {
          DEFAULT: "var(--success)",
          bg: "var(--success-bg)",
          br: "var(--success-border)",
        },
        warn: {
          DEFAULT: "var(--warn)",
          bg: "var(--warn-bg)",
          br: "var(--warn-border)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          bg: "var(--danger-bg)",
          br: "var(--danger-border)",
        },
        info: {
          DEFAULT: "var(--info)",
          bg: "var(--info-bg)",
          br: "var(--info-border)",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        lg: "var(--shadow-lg)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "none" },
        },
        blip: {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "20%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0.6", transform: "scale(1)" },
        },
        "pulse-dot": {
          "0%,100%": {
            boxShadow:
              "0 0 0 0 color-mix(in oklch, var(--success) 50%, transparent)",
          },
          "50%": {
            boxShadow:
              "0 0 0 5px color-mix(in oklch, var(--success) 0%, transparent)",
          },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        blip: "blip 0.6s ease-out",
        "pulse-dot": "pulse-dot 1.6s ease-out infinite",
      },
    },
  },
};

export default config;
