// Тип NextConfig помогает TypeScript проверять next.config.
import type { NextConfig } from "next";

// Конфигурация Next.js.
const nextConfig: NextConfig = {
  // Отключаем dev-indicator, потому что он мешал чистой визуальной проверке в dev.
  devIndicators: false
};

// Экспортируем конфиг для Next.js.
export default nextConfig;
