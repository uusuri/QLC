// Link — переходы между страницами Next.js без полной перезагрузки.
import Link from "next/link";

// AuthForm — клиентская форма username/password login.
import { AuthForm } from "@/components/AuthForm";

// Login-тезисы берем из сервисного слоя, чтобы данные страницы были в одном месте.
import { getLoginNotes } from "@/services/api";

// Props страницы login.
type LoginPageProps = {
  // searchParams в Next 15 приходит как Promise.
  searchParams?: Promise<{
    // redirectTo позволяет вернуться на урок после входа.
    redirectTo?: string;
  }>;
};

// Страница входа.
export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Получаем query-параметры.
  const params = await searchParams;

  // Получаем короткие тезисы login-экрана.
  const loginNotes = await getLoginNotes();

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-32px)] max-w-7xl border border-line bg-ink/90 lg:grid-cols-[1fr_520px]">
        <div className="grid content-between gap-12 border-b border-line p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <header className="flex items-center justify-between gap-4 font-mono text-xs font-bold uppercase">
            <Link className="transition hover:text-acid" href="/">
              Course Archive
            </Link>
            <Link className="text-white/48 transition hover:text-acid" href="/profile">
              Профиль
            </Link>
          </header>

          <div>
            <p className="mb-5 font-mono text-xs font-bold uppercase text-acid">
              login screen / username access
            </p>
            <h1 className="max-w-4xl text-5xl font-black uppercase leading-[1.02] sm:text-7xl lg:text-8xl">
              Вход для сабмитов.
            </h1>
          </div>

          <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
            {loginNotes.map((note, index) => (
              <div className="bg-panel p-4" key={note.id}>
                <span className="font-mono text-xs font-black text-acid">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="mt-8 text-sm font-black uppercase leading-tight text-white/74">
                  {note.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        <aside className="grid content-center p-5 sm:p-7">
          <div className="border border-line bg-panel/95 p-5">
            <AuthForm mode="login" redirectTo={params?.redirectTo} />
          </div>
        </aside>
      </section>
    </main>
  );
}
