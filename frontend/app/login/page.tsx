import Link from "next/link";

import { AuthForm } from "@/components/AuthForm";
import { RedirectIfAuthenticated } from "@/components/RedirectIfAuthenticated";
import { SiteFooter } from "@/components/SiteFooter";
import { getLoginNotes } from "@/services/api";

type LoginPageProps = {
  searchParams?: Promise<{
    redirectTo?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const loginNotes = await getLoginNotes();

  return (
    <main className="flex min-h-screen flex-col">
      <RedirectIfAuthenticated redirectTo={params?.redirectTo} />
      <div className="flex flex-1 items-stretch px-4 py-4 sm:px-6 lg:px-8">
        <section className="mx-auto grid min-h-[calc(100vh-32px)] w-full max-w-7xl border border-line bg-ink/90 lg:grid-cols-[1fr_520px]">
          <div className="relative grid content-between gap-12 overflow-hidden border-b border-line p-5 sm:p-7 lg:border-b-0 lg:border-r">
            <header className="flex items-center justify-between gap-4 font-mono text-xs font-bold uppercase">
              <Link className="flex items-center gap-3 transition hover:text-acid" href="/">
                <span className="inline-flex h-2 w-2 rounded-full bg-acid shadow-[0_0_12px_rgba(255,106,61,0.5)]" />
                QLC
              </Link>
              <Link className="text-white/48 transition hover:text-acid" href="/register">
                Регистрация
              </Link>
            </header>

            <div className="relative z-10">
              <p className="mb-5 font-mono text-xs font-bold uppercase text-acid">Вход</p>
              <h1 className="max-w-4xl text-5xl font-black uppercase leading-[1.02] sm:text-7xl lg:text-8xl">
                Доступ
                <br />
                к обучению.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-white/58">
                Войдите, чтобы открывать курсы, отправлять решения и отслеживать прогресс в профиле.
              </p>
            </div>

            <div className="relative z-10 grid gap-px border border-line bg-line sm:grid-cols-3">
              {loginNotes.map((note, index) => (
                <div className="relative bg-panel p-4" key={note.id}>
                  <span className="font-mono text-xs font-black text-acid">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-8 text-sm font-black uppercase leading-tight text-white/74">
                    {note.title}
                  </p>
                </div>
              ))}
            </div>

            {/* Decorative background accents */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-acid/10 blur-3xl"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/[0.04] blur-3xl"
            />
          </div>

          <aside className="grid content-center p-5 sm:p-7">
            <div className="relative border border-line bg-panel/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
              <AuthForm mode="login" redirectTo={params?.redirectTo} />
            </div>
          </aside>
        </section>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <SiteFooter />
      </div>
    </main>
  );
}
