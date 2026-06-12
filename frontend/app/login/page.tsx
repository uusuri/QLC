// Link — переходы между страницами Next.js без полной перезагрузки.
import Link from "next/link";

// Кнопка Telegram-входа вынесена в отдельный клиентский компонент.
import { TelegramLoginButton } from "@/components/TelegramLoginButton";

// Login-тезисы берем из сервисного слоя, чтобы данные страницы были в одном месте.
import { getLoginNotes } from "@/services/api";

// Страница входа.
export default async function LoginPage() {
  // Получаем короткие тезисы login-экрана.
  const loginNotes = await getLoginNotes();

  // Возвращаем JSX-разметку login-страницы.
  return (
    // main задает минимальную высоту и внешние отступы страницы.
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      {/* Общий контейнер: на desktop две колонки, на mobile одна. */}
      <section className="mx-auto grid min-h-[calc(100vh-32px)] max-w-7xl border border-line bg-ink/90 lg:grid-cols-[1fr_520px]">
        {/* Левая колонка с брендом, заголовком и тезисами. */}
        <div className="grid content-between gap-12 border-b border-line p-5 sm:p-7 lg:border-b-0 lg:border-r">
          {/* Верхняя навигация login-экрана. */}
          <header className="flex items-center justify-between gap-4 font-mono text-xs font-bold uppercase">
            {/* Переход на главную. */}
            <Link className="transition hover:text-acid" href="/">
              Course Archive
            </Link>
            {/* Переход в профиль. */}
            <Link className="text-white/48 transition hover:text-acid" href="/profile">
              Профиль
            </Link>
          </header>

          {/* Главный текст login-экрана. */}
          <div>
            {/* Техническая подпись. */}
            <p className="mb-5 font-mono text-xs font-bold uppercase text-acid">
              login screen / telegram only
            </p>
            {/* Главный заголовок. */}
            <h1 className="max-w-4xl text-5xl font-black uppercase leading-[1.02] sm:text-7xl lg:text-8xl">
              Один вход. Никаких полей.
            </h1>
          </div>

          {/* Сетка преимуществ входа через Telegram. */}
          <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
            {/* map выводит каждую заметку из loginNotes отдельной ячейкой. */}
            {loginNotes.map((note, index) => (
              // Одна ячейка с номером и текстом.
              <div className="bg-panel p-4" key={note.id}>
                {/* Номер ячейки. padStart делает 01, 02, 03. */}
                <span className="font-mono text-xs font-black text-acid">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {/* Текст ячейки. */}
                <p className="mt-8 text-sm font-black uppercase leading-tight text-white/74">
                  {note.title}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Правая колонка с карточкой авторизации. */}
        <aside className="grid content-center p-5 sm:p-7">
          {/* Карточка Telegram-входа. */}
          <div className="border border-line bg-panel/95">
            {/* Верх карточки: заголовок и описание. */}
            <div className="border-b border-line p-5">
              {/* Маленькая подпись. */}
              <p className="font-mono text-xs font-bold uppercase text-acid">
                anonymous access
              </p>
              {/* Заголовок карточки. */}
              <h2 className="mt-4 text-3xl font-black uppercase leading-[1.04] sm:text-5xl">
                Авторизация через Telegram
              </h2>
              {/* Пояснение, что сейчас это mock до backend. */}
              <p className="mt-5 text-base leading-snug text-white/58">
                Сейчас кнопка работает как временная заглушка. После backend-интеграции
                она будет запускать Telegram Login Widget или WebApps API.
              </p>
            </div>

            {/* Низ карточки: кнопка и технические ограничения. */}
            <div className="grid gap-4 p-5">
              {/* Клиентская кнопка с onClick и mock-состоянием. */}
              <TelegramLoginButton />
              {/* Технические подписи о безопасности и будущей интеграции. */}
              <div className="grid gap-2 border border-line p-4 font-mono text-[10px] font-bold uppercase text-white/42">
                {/* Пароли не храним. */}
                <span>no password storage</span>
                {/* Личный профиль не требует персональных полей. */}
                <span>no personal profile fields</span>
                {/* Проверка доступа появится после backend. */}
                <span>access check pending backend</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
