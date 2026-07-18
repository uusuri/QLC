// Тип Config помогает TypeScript проверять структуру Tailwind-конфига.
import type { Config } from "tailwindcss";

// Главный конфиг Tailwind CSS.
const config: Config = {
  // content говорит Tailwind, где искать className, чтобы сгенерировать CSS.
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  // theme хранит дизайн-токены проекта.
  theme: {
    // extend добавляет наши значения, не удаляя стандартные Tailwind-токены.
    extend: {
      // Кастомные цвета проекта.
      colors: {
        // Главный акцент в духе Marathon.
        acid: "#ff6a3d",
        // Основной почти черный фон.
        ink: "#050304",
        // Цвет темных панелей.
        panel: "#101013",
        // Цвет линий/рамок.
        line: "rgba(255, 255, 255, 0.14)",
        // Дополнительный теплый акцент.
        ember: "#ff8a5b",
        // Фосфорно-зеленый акцент терминала Marathon.
        phosphor: "#7dff6a"
      },
      // Кастомные наборы шрифтов.
      fontFamily: {
        // Моноширинный стек для интерфейса.
        mono: [
          "IBM Plex Mono",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace"
        ],
        // Засечки для крупных заголовков в духе sci-fi/ Marathon.
        display: [
          "Georgia",
          "Times New Roman",
          "serif"
        ],
        // Запасной sans-stack, если где-то понадобится обычный гротеск.
        sans: ["Arial", "Helvetica", "sans-serif"]
      },
      // Marathon-анимации.
      animation: {
        "marathon-drift": "marathon-drift 8s ease-in-out infinite",
        "marathon-pulse": "marathon-pulse 4.5s ease-in-out infinite",
        "marathon-marquee": "marathon-marquee 26s linear infinite",
        "marathon-scan": "marathon-scan 14s linear infinite",
        "marathon-flicker": "marathon-flicker 3.2s ease-in-out infinite",
        "marathon-border-flow": "marathon-border-flow 2.6s linear infinite"
      },
      keyframes: {
        "marathon-drift": {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -8px, 0)" }
        },
        "marathon-pulse": {
          "0%, 100%": { opacity: "0.72", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.02)" }
        },
        "marathon-marquee": {
          "0%": { transform: "translate3d(0, 0, 0)" },
          "100%": { transform: "translate3d(-50%, 0, 0)" }
        },
        "marathon-scan": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 100%" }
        },
        "marathon-flicker": {
          "0%, 100%": { opacity: "1" },
          "41%": { opacity: "1" },
          "42%": { opacity: "0.4" },
          "43%": { opacity: "1" },
          "45%": { opacity: "0.6" },
          "46%": { opacity: "1" }
        },
        "marathon-border-flow": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" }
        }
      },
      boxShadow: {
        // Мягкое свечение акцента.
        acid: "0 0 30px rgba(255, 106, 61, 0.25)",
        // Внутреннее свечение панели.
        "panel-inset": "inset 0 0 60px rgba(255, 106, 61, 0.04)",
        // Тень для HUD-элементов.
        hud: "0 18px 60px rgba(0, 0, 0, 0.55)"
      },
      backgroundImage: {
        // Градиент для активных кнопок/рамок.
        "acid-flow":
          "linear-gradient(90deg, #ff6a3d, #ff8a5b, #ff6a3d, #ff8a5b)"
      }
    }
  },
  // Плагины Tailwind пока не используются.
  plugins: []
};

// Экспортируем конфиг для Tailwind.
export default config;
