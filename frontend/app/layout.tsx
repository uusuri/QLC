// Metadata — тип Next.js для описания meta-информации страницы.
import type { Metadata } from "next";

// AuthProvider дает всем client-компонентам доступ к текущему пользователю.
import { AuthProvider } from "@/components/AuthProvider";

// Подключаем глобальные стили один раз на все приложение.
import "./globals.css";

// Metadata используется Next.js для title/description.
export const metadata: Metadata = {
  title: "QLC — обучение программированию через практику",
  description: "Короткая теория, задачи и проверка кода в одном окне."
};

// RootLayout — корневой layout для всех страниц внутри app router.
export default function RootLayout({
  // children — текущая страница, которую Next подставляет внутрь layout.
  children
}: Readonly<{
  // Тип children: любой React-узел.
  children: React.ReactNode;
}>) {
  // Возвращаем HTML-обертку всего приложения.
  return (
    // lang="ru" говорит браузеру и screen reader, что основной язык русский.
    <html lang="ru">
      {/* В body рендерится конкретная страница. */}
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
