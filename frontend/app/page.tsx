// Link — компонент Next.js для переходов между страницами без полной перезагрузки.
import Link from "next/link";

// Данные курсов приходят через сервисный слой из backend/БД.
import { getCourseCatalog } from "@/services/api";

// ButtonLink нужен для единого CTA из shared UI-kit.
import { ButtonLink } from "@/components/ui";

// AuthStatus показывает Вход или @username/Выйти после hydration.
import { AuthStatus } from "@/components/AuthStatus";

// Тип карточки нужен для локальной переменной courses в try/catch.
import type { CourseDto } from "@/types";

// Главная должна перечитывать backend при reload, чтобы курсы из /admin/content появлялись сразу.
export const dynamic = "force-dynamic";

// Главная страница сайта.
export default async function HomePage() {
  // Курсы приходят из backend через services/api.ts; при ошибке показываем error state.
  let courses: CourseDto[] = [];

  // Сообщение не содержит stack trace, чтобы пользователь видел понятную проблему.
  let loadError = "";

  try {
    // Получаем каталог через GET /api/courses и mapper backend DTO -> frontend DTO.
    courses = await getCourseCatalog();
  } catch {
    loadError = "Не удалось загрузить курсы с сервера. Проверь backend.";
  }

  // Возвращаем JSX-разметку главной страницы.
  return (
    // main — корневая область страницы с адаптивными внешними отступами.
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      {/* Общий контейнер страницы с максимальной шириной и рамкой. */}
      <div className="mx-auto max-w-7xl border border-line bg-ink/90">
        {/* Шапка сайта: бренд слева, навигация справа. */}
        <header className="flex items-center justify-between border-b border-line px-5 py-4 text-xs font-black uppercase tracking-wide sm:px-7">
          {/* Название бренда/проекта. */}
          <span>Course Archive</span>
          {/* Навигация по главной и страницам приложения. */}
          <nav className="flex items-center gap-5">
            {/* Якорная ссылка к блоку курсов на этой же странице. */}
            <a className="transition hover:text-acid" href="#courses">
              Курсы
            </a>
            {/* AuthStatus после входа показывает username и logout. */}
            <AuthStatus />
            {/* Переход в личный кабинет. */}
            <Link className="text-acid" href="/profile">
              Профиль
            </Link>
          </nav>
        </header>

        {/* Hero-секция: главный оффер и CTA-кнопки. */}
        <section className="grid min-h-[calc(100vh-74px)] gap-8 border-b border-line px-5 py-12 sm:px-7 lg:grid-cols-[1.12fr_0.88fr] lg:py-20">
          {/* Левая часть hero с технической подписью и большим заголовком. */}
          <div>
            {/* Маленькая подпись над заголовком. */}
            <p className="mb-5 font-mono text-xs font-bold uppercase text-acid">
              private course system / 2026
            </p>
            {/* Главный заголовок главной страницы. */}
            <h1 className="max-w-5xl text-5xl font-black uppercase leading-[1.02] sm:text-7xl lg:text-8xl">
              Код. Курсы. Закрытый доступ.
            </h1>
          </div>

          {/* Правая часть hero: описание и две кнопки действия. */}
          <div className="grid content-end gap-5 text-base leading-snug text-white/64 sm:text-lg">
            {/* Краткое объяснение продукта. */}
            <p>
              Темная учебная платформа с курсами, профилем, прогрессом и
              будущей автопроверкой кода. Минимум шума, максимум действия.
            </p>

            {/* Контейнер кнопок, flex-wrap переносит кнопки на маленьком экране. */}
            <div className="flex flex-wrap gap-3">
              {/* Главная CTA-кнопка ведет на авторизацию. */}
              <Link
                className="inline-flex min-h-12 items-center border border-acid bg-acid px-5 text-xs font-black uppercase text-ink transition hover:bg-transparent hover:text-acid"
                href="/login"
              >
                Войти в аккаунт
              </Link>
              {/* Вторичная кнопка прокручивает к курсам. */}
              <a
                className="inline-flex min-h-12 items-center border border-line px-5 text-xs font-black uppercase text-white/72 transition hover:border-acid hover:text-acid"
                href="#courses"
              >
                Смотреть курсы
              </a>
            </div>
          </div>
        </section>

        {/* Секция курсов. id нужен для якоря #courses. */}
        <section className="px-5 py-10 sm:px-7 lg:py-14" id="courses">
          {/* Заголовок секции и поясняющий текст. */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            {/* Левая часть заголовка секции. */}
            <div>
              {/* Техническая подпись секции. */}
              <p className="font-mono text-xs font-bold uppercase text-acid">
                available courses
              </p>
              {/* Название секции. */}
              <h2 className="mt-3 text-4xl font-black uppercase leading-none sm:text-6xl">
                Курсы
              </h2>
            </div>
            {/* Правая поясняющая подпись. */}
            <p className="max-w-md text-sm leading-snug text-white/54 sm:text-right">
              Карточки собраны как витрина продукта: изображение, описание,
              цена, скидка и покупка в одном жестком блоке.
            </p>
          </div>

          {/* Если backend недоступен, показываем понятную ошибку без stack trace. */}
          {loadError ? (
            <CatalogState
              actionHref="/admin/content"
              actionText="Открыть админку"
              text={loadError}
              title="Backend unavailable"
            />
          ) : courses.length === 0 ? (
            // Пустая база — это нормальное состояние, не повод показывать моковые курсы.
            <CatalogState
              actionHref="/admin/content"
              actionText="Перейти в админку"
              text="Курсов пока нет. Создай первый курс в /admin/content."
              title="Каталог пуст"
            />
          ) : (
            // Сетка карточек курсов: на desktop 3 колонки, на mobile одна колонка.
            <div className="grid gap-px border border-line bg-line lg:grid-cols-3">
              {/* map превращает backend-курсы в набор карточек. */}
              {courses.map((course, courseIndex) => {
                // В Sprint 2 пользовательский путь открыт для первого курса.
                const isCourseAvailable = courseIndex === 0;

                return (
                // Карточка одного курса.
                <article className="group grid bg-ink" key={course.slug}>
                  {/* Верх карточки: картинка, overlay и badge. */}
                  <div className="relative aspect-[16/10] overflow-hidden border-b border-line bg-panel">
                    {/* Изображение курса; alt пустой, потому что картинка декоративная. */}
                    <img
                      alt=""
                      className="h-full w-full object-cover grayscale transition duration-300 group-hover:scale-105 group-hover:grayscale-0"
                      src={course.imageUrl}
                    />
                    {/* Темный градиент поверх картинки для читабельности badge. */}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/18 to-transparent" />
                    {/* Метка курса в левом верхнем углу изображения. */}
                    <span className="absolute left-4 top-4 border border-acid bg-ink/72 px-2 py-1 font-mono text-[10px] font-bold uppercase text-acid">
                      {isCourseAvailable ? course.badge : "soon"}
                    </span>
                  </div>

                  {/* Нижняя часть карточки: описание, цена, кнопка. */}
                  <div className="grid min-h-[360px] content-between gap-8 bg-panel/35 p-5 sm:p-6">
                    {/* Текстовая часть карточки. */}
                    <div>
                      {/* Верхняя строка метаданных. */}
                      <div className="mb-4 flex items-center justify-between gap-4 font-mono text-xs font-bold uppercase text-white/42">
                        {/* Количество уроков. */}
                        <span>{course.lessonsLabel}</span>
                        {/* Формат курса. */}
                        <span>online</span>
                      </div>
                      {/* Название курса. */}
                      <h3 className="text-3xl font-black uppercase leading-[1.02] sm:text-4xl">
                        {course.title}
                      </h3>
                      {/* Описание курса. */}
                      <p className="mt-4 text-base leading-snug text-white/62">
                        {course.description}
                      </p>
                    </div>

                    {/* Нижняя часть карточки с ценой и покупкой. */}
                    <div className="grid gap-4">
                      {/* Строка цены и старой цены. */}
                      <div className="flex items-end justify-between gap-4">
                        {/* Текущая цена. */}
                        <div>
                          {/* Подпись цены. */}
                          <p className="font-mono text-xs font-bold uppercase text-white/38">
                            Цена курса
                          </p>
                          {/* Значение текущей цены. */}
                          <strong className="mt-1 block text-3xl font-black leading-none">
                            {course.price.formatted}
                          </strong>
                        </div>
                        {/* Старая цена показывается только если mapper смог ее посчитать. */}
                        {course.oldPrice.amount > course.price.amount && (
                          <span className="font-mono text-xs font-bold text-white/38 line-through">
                            {course.oldPrice.formatted}
                          </span>
                        )}
                      </div>

                      {/* Первый курс ведет в реальный learning path, остальные не ведут в фиктивную оплату. */}
                      <ButtonLink
                        disabled={!isCourseAvailable}
                        href={`/courses/${course.slug}`}
                        variant={isCourseAvailable ? "primary" : "secondary"}
                      >
                        {isCourseAvailable ? "Открыть курс" : "Скоро"}
                      </ButtonLink>
                    </div>
                  </div>
                </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// Общий блок для empty/error state каталога.
function CatalogState({
  actionHref,
  actionText,
  text,
  title
}: {
  actionHref: string;
  actionText: string;
  text: string;
  title: string;
}) {
  return (
    <div className="grid gap-5 border border-line bg-panel/80 p-5 sm:p-7">
      {/* Технический заголовок состояния. */}
      <p className="font-mono text-xs font-bold uppercase text-acid">{title}</p>
      {/* Основной текст состояния. */}
      <p className="max-w-2xl text-xl font-black uppercase leading-tight text-white sm:text-3xl">
        {text}
      </p>
      {/* Переход в admin/content для создания первого курса или проверки данных. */}
      <Link
        className="inline-flex min-h-12 w-fit items-center border border-acid bg-acid px-5 text-xs font-black uppercase text-ink transition hover:bg-transparent hover:text-acid"
        href={actionHref}
      >
        {actionText}
      </Link>
    </div>
  );
}
