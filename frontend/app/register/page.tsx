import Link from "next/link";

import { AuthForm } from "@/components/AuthForm";
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
      <div className="flex flex-1 items-stretch px-4 py-4 sm:px-6 lg:px-8">
        <section className="mx-auto grid min-h-[calc(100vh-32px)] w-full max-w-7xl border border-line bg-ink/90 lg:grid-cols-[1fr_520px]">
          <div className="relative grid content-between gap-12 overflow-hidden border-b border-line p-5 sm:p-7 lg:border-b-0 lg:border-r">
            <header className="flex items-center justify-between gap-4 font-mono text-xs font-bold uppercase">
              <Link className="flex items-center gap-3 transition hover:text-acid" href="/">
                <span className="inline-flex h-2 w-2 rounded-full bg-acid shadow-[0_0_12px_rgba(255,106,61,0.5)]" />
                Course Archive
              </Link>
              <Link className="text-white/48 transition hover:text-acid" href="/login">
                Вход
              </Link>
            </header>

            <div className="relative z-10">
              <p className="mb-5 font-mono text-xs font-bold uppercase text-acid">
                register screen / create identity
              </p>
              <h1 className="max-w-4xl text-5xl font-black uppercase leading-[1.02] sm:text-7xl lg:text-8xl">
                Создай
                <br />
                аккаунт.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-white/58">
                После регистрации токен сохранится локально. Submission на проверку и персональная
                статистика станут доступны сразу.
              </p>
            </div>

            <div className="relative z-10 grid gap-px border border-line bg-line sm:grid-cols-3">
              <div className="relative bg-panel p-4">
                <span className="font-mono text-xs font-black text-acid">01</span>
                <p className="mt-8 text-sm font-black uppercase leading-tight text-white/74">
                  username 3-32 символа
                </p>
              </div>
              <div className="relative bg-panel p-4">
                <span className="font-mono text-xs font-black text-acid">02</span>
                <p className="mt-8 text-sm font-black uppercase leading-tight text-white/74">
                  email для аккаунта
                </p>
              </div>
              <div className="relative bg-panel p-4">
                <span className="font-mono text-xs font-black text-acid">03</span>
                <p className="mt-8 text-sm font-black uppercase leading-tight text-white/74">
                  пароль не хранится в UI
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

          <aside className="grid content-center p-5 sm:p-7">
            <div className="relative border border-line bg-panel/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
              <AuthForm mode="register" redirectTo={params?.redirectTo} />
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
