import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        acid: "#b8ff35",
        ink: "#0b0d0f",
        panel: "#16191c",
        line: "rgba(255, 255, 255, 0.11)",
        ember: "#d7ff7d",
        phosphor: "#b8ff35"
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
        display: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Arial", "sans-serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Arial", "sans-serif"]
      },
      boxShadow: {
        acid: "0 18px 50px rgba(184, 255, 53, 0.16)",
        "panel-inset": "inset 0 0 60px rgba(184, 255, 53, 0.03)",
        hud: "0 24px 80px rgba(0, 0, 0, 0.32)"
      }
    }
  },
  plugins: []
};

export default config;
