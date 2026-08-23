import Link from "next/link";

import { AuthForm } from "@/components/AuthForm";
import { RedirectIfAuthenticated } from "@/components/RedirectIfAuthenticated";
import { SiteFooter } from "@/components/SiteFooter";

type RegisterPageProps = {
  searchParams?: Promise<{
    redirectTo?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;

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
              <Link className="text-white/48 transition hover:text-acid" href="/login">
                Вход
              </Link>
            </header>

            <div className="relative z-10">
              <p className="mb-5 font-mono text-xs font-bold uppercase text-acid">Регистрация</p>
              <p aria-hidden="true" className="max-w-4xl text-5xl font-black uppercase leading-[1.02] sm:text-7xl lg:text-6xl xl:text-8xl">
                Создайте
                <br />
                аккаунт.
              </p>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-white/58">
                После регистрации можно покупать курсы, сохранять прогресс и отправлять решения на проверку.
              </p>
            </div>

            <div className="relative z-10 grid gap-px border border-line bg-line sm:grid-cols-3">
              <div className="relative bg-panel p-4">
                <span className="font-mono text-xs font-black text-acid">01</span>
                <p className="mt-8 text-sm font-black uppercase leading-tight text-white/74">
                  Логин 3–32 символа
                </p>
              </div>
              <div className="relative bg-panel p-4">
                <span className="font-mono text-xs font-black text-acid">02</span>
                <p className="mt-8 text-sm font-black uppercase leading-tight text-white/74">
                  Email для входа
                </p>
              </div>
              <div className="relative bg-panel p-4">
                <span className="font-mono text-xs font-black text-acid">03</span>
                <p className="mt-8 text-sm font-black uppercase leading-tight text-white/74">
                  Пароль не хранится в браузере
                </p>
              </div>
            </div>

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
              <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-white/68 transition hover:text-phosphor" href="/login">
                Вход
              </Link>
            </header>
            <div className="grid content-center" id="main-content" tabIndex={-1}>
              <div className="relative rounded-[24px] border border-line bg-panel/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.36)] sm:p-7">
                <AuthForm mode="register" redirectTo={params?.redirectTo} />
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
