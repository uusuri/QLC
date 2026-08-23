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
        <section className="mx-auto grid min-h-[calc(100svh-32px)] w-full max-w-7xl overflow-hidden rounded-[28px] border border-line bg-ink/90 lg:grid-cols-[minmax(0,1fr)_460px] xl:grid-cols-[1fr_520px]">
          <div className="relative hidden content-between gap-12 overflow-hidden border-r border-line p-7 lg:grid">
            <header className="flex items-center justify-between gap-4 font-mono text-xs font-bold uppercase">
              <Link className="flex items-center gap-3 transition hover:text-acid" href="/">
                <span className="inline-flex h-2 w-2 rounded-full bg-acid shadow-[0_0_12px_rgba(184,255,53,0.5)]" />
                QLC
              </Link>
              <Link className="text-white/48 transition hover:text-acid" href="/register">
                Регистрация
              </Link>
            </header>

            <div className="relative z-10">
              <p className="mb-5 font-mono text-xs font-bold uppercase text-acid">Вход</p>
              <p aria-hidden="true" className="max-w-4xl text-5xl font-black uppercase leading-[1.02] sm:text-7xl lg:text-6xl xl:text-8xl">
                Доступ
                <br />
                к обучению.
              </p>
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

          <section className="grid grid-rows-[auto_1fr] gap-6 p-5 sm:p-7 lg:gap-0">
            <header className="flex items-center justify-between gap-4 lg:hidden">
              <Link className="flex items-center gap-3 font-black tracking-[-0.04em]" href="/">
                <span className="grid h-8 w-8 rotate-45 place-items-center bg-phosphor">
                  <span className="-rotate-45 text-[9px] font-black text-ink">Q</span>
                </span>
                QLC
              </Link>
              <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-white/68 transition hover:text-phosphor" href="/register">
                Регистрация
              </Link>
            </header>
            <div className="grid content-center" id="main-content" tabIndex={-1}>
              <div className="relative rounded-[24px] border border-line bg-panel/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.36)] sm:p-7">
                <AuthForm mode="login" redirectTo={params?.redirectTo} />
              </div>
            </div>
          </section>
        </section>
      </div>

      <div className="mx-auto w-full max-w-[1344px] px-4 sm:px-6 lg:px-8">
        <SiteFooter />
      </div>
    </main>
  );
}
