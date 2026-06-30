// Link нужен для перехода на главную и login.
import Link from "next/link";

// AuthForm — общая клиентская форма для регистрации.
import { AuthForm } from "@/components/AuthForm";

// Props страницы register.
type RegisterPageProps = {
  // searchParams в Next 15 приходит как Promise.
  searchParams?: Promise<{
    // redirectTo сохраняет путь, откуда пользователь пришел.
    redirectTo?: string;
  }>;
};

// Страница регистрации.
export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-32px)] max-w-7xl border border-line bg-ink/90 lg:grid-cols-[1fr_520px]">
        <div className="grid content-between gap-12 border-b border-line p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <header className="flex items-center justify-between gap-4 font-mono text-xs font-bold uppercase">
            <Link className="transition hover:text-acid" href="/">
              Course Archive
            </Link>
            <Link className="text-white/48 transition hover:text-acid" href="/login">
              Вход
            </Link>
          </header>

          <div>
            <p className="mb-5 font-mono text-xs font-bold uppercase text-acid">
              register screen / sprint 2
            </p>
            <h1 className="max-w-4xl text-5xl font-black uppercase leading-[1.02] sm:text-7xl lg:text-8xl">
              Аккаунт для прогресса.
            </h1>
          </div>

          <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
            <div className="bg-panel p-4">
              <span className="font-mono text-xs font-black text-acid">01</span>
              <p className="mt-8 text-sm font-black uppercase leading-tight text-white/74">
                username 3-32 символа
              </p>
            </div>
            <div className="bg-panel p-4">
              <span className="font-mono text-xs font-black text-acid">02</span>
              <p className="mt-8 text-sm font-black uppercase leading-tight text-white/74">
                email для аккаунта
              </p>
            </div>
            <div className="bg-panel p-4">
              <span className="font-mono text-xs font-black text-acid">03</span>
              <p className="mt-8 text-sm font-black uppercase leading-tight text-white/74">
                пароль не хранится в UI
              </p>
            </div>
          </div>
        </div>

        <aside className="grid content-center p-5 sm:p-7">
          <div className="border border-line bg-panel/95 p-5">
            <AuthForm mode="register" redirectTo={params?.redirectTo} />
          </div>
        </aside>
      </section>
    </main>
  );
}
