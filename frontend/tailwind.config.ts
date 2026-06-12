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
        // Главный кислотный акцент.
        acid: "#9ef651",
        // Основной почти черный фон.
        ink: "#050505",
        // Цвет темных панелей.
        panel: "#111214",
        // Цвет линий/рамок.
        line: "rgba(255, 255, 255, 0.12)"
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
        // Запасной sans-stack, если где-то понадобится обычный гротеск.
        sans: ["Arial", "Helvetica", "sans-serif"]
      }
    }
  },
  // Плагины Tailwind пока не используются.
  plugins: []
};

// Экспортируем конфиг для Tailwind.
export default config;
