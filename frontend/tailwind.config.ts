import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        acid: "#c4ff00",
        ink: "#0A0A0A",
        panel: "#101210",
        surface: "#101210",
        "surface-raised": "#171A16",
        line: "#32372E",
        muted: "#A6A6A0",
        ember: "#d7ff7d",
        phosphor: "#c4ff00",
        paper: "#F5F5EF",
        cobalt: "#4433EE",
        coral: "#ff6652"
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
        display: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Arial", "sans-serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Arial", "sans-serif"]
      },
      boxShadow: {
        acid: "none",
        "panel-inset": "inset 0 0 60px rgba(184, 255, 53, 0.03)",
        hud: "0 24px 80px rgba(0, 0, 0, 0.32)"
      },
      opacity: {
        8: "0.08",
        9: "0.09",
        12: "0.12",
        18: "0.18",
        22: "0.22",
        28: "0.28",
        32: "0.32",
        34: "0.34",
        35: "0.35",
        36: "0.36",
        38: "0.38",
        42: "0.42",
        45: "0.45",
        46: "0.46",
        48: "0.48",
        52: "0.52",
        54: "0.54",
        55: "0.55",
        56: "0.56",
        58: "0.58",
        62: "0.62",
        64: "0.64",
        65: "0.65",
        66: "0.66",
        68: "0.68",
        72: "0.72",
        74: "0.74",
        76: "0.76",
        84: "0.84",
        86: "0.86",
        88: "0.88"
      }
    }
  },
  plugins: []
};

export default config;
