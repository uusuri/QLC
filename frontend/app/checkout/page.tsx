// Link нужен для переходов между страницами Next.js без полной перезагрузки сайта.
import Link from "next/link";

// Импортируем клиентский компонент выбора способа оплаты.
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";

// Checkout получает курсы, тексты доступа и методы оплаты из сервисного слоя.
import { COURSE_ACCESS_COPY, getCourseCatalog, getPaymentMethods } from "@/services/api";

// Тип состояния доступа нужен для строго типизированного компонента AccessState.
import type { CourseAccessStatus } from "@/types";

// Тип props страницы checkout.
type CheckoutPageProps = {
  // В Next 15 searchParams в app router типизируется как Promise.
  searchParams?: Promise<{
    // course — query-параметр из URL.
    course?: string;
  }>;
};

// Серверный компонент страницы checkout.
export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  // Дожидаемся query-параметров из URL.
  const params = await searchParams;

  // Параллельно получаем каталог и методы оплаты через services/api.ts.
  const [courses, paymentMethods] = await Promise.all([
    getCourseCatalog(),
    getPaymentMethods()
  ]);

  // Ищем курс по slug из URL.
  const selectedCourse =
    // Если URL: /checkout?course=web-design-system, выберется Web Design System.
    courses.find((course) => course.slug === params?.course) ?? courses[0];

  // Берем тексты для текущего статуса доступа.
  const access = COURSE_ACCESS_COPY[selectedCourse.access];

  // Флаг, который решает: показывать оплату или кнопку "Начать учиться".
  const needsPayment = selectedCourse.access === "locked";

  // Возвращаем JSX-разметку страницы.
  return (
    // Главная область страницы с внешними отступами.
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      {/* Основной контейнер страницы с жесткой рамкой. */}
      <section className="mx-auto max-w-7xl border border-line bg-ink/90">
        {/* Верхняя навигация checkout-страницы. */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-5 text-xs font-black uppercase sm:px-7">
          {/* Ссылка на главную. */}
          <Link className="transition hover:text-acid" href="/">
            Course Archive
          </Link>
          {/* Правая часть навигации. */}
          <nav className="flex items-center gap-5 text-white/50">
            {/* Ссылка на страницу входа. */}
            <Link className="transition hover:text-acid" href="/login">
              Вход
            </Link>
            {/* Ссылка на профиль. */}
            <Link className="transition hover:text-acid" href="/profile">
              Профиль
            </Link>
          </nav>
        </header>

        {/* Главный блок: слева оффер, справа карточка оплаты. */}
        <section className="grid border-b border-line lg:grid-cols-[1fr_440px]">
          {/* Левая колонка с крупным заголовком и состояниями доступа. */}
          <div className="grid gap-12 border-b border-line p-5 sm:p-7 lg:min-h-[620px] lg:border-b-0 lg:border-r">
            {/* Верхняя часть левой колонки. */}
            <div>
              {/* Техническая подпись страницы. */}
              <p className="mb-5 text-xs font-bold uppercase text-acid">
                checkout / instant access
              </p>
              {/* Главный заголовок страницы. */}
              <h1 className="max-w-5xl text-5xl font-black uppercase leading-[1.02] sm:text-7xl lg:text-8xl">
                Оплата курса без корзины.
              </h1>
            </div>

            {/* Три состояния карточки курса: open, locked, pending. */}
            <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
              {/* Состояние открытого курса. */}
              <AccessState state="open" active={selectedCourse.access === "open"} />
              {/* Состояние курса, требующего оплаты. */}
              <AccessState state="locked" active={selectedCourse.access === "locked"} />
              {/* Состояние ожидания платежа. */}
              <AccessState state="pending" active={selectedCourse.access === "pending"} />
            </div>
          </div>

          {/* Правая колонка с выбранным курсом и оплатой. */}
          <aside className="grid content-center p-5 sm:p-7">
            {/* Карточка подтверждения покупки. */}
            <div className="border border-line bg-panel/95">
              {/* Верх карточки: статус, название и описание. */}
              <div className="border-b border-line p-5">
                {/* Короткий статус доступа. */}
                <p className="text-xs font-bold uppercase text-acid">{access.label}</p>
                {/* Название выбранного курса. */}
                <h2 className="mt-4 text-3xl font-black uppercase leading-[1.04] sm:text-5xl">
                  {selectedCourse.title}
                </h2>
                {/* Описание выбранного курса. */}
                <p className="mt-5 text-sm leading-snug text-white/58">
                  {selectedCourse.description}
                </p>
              </div>

              {/* Блок цены и состава курса. */}
              <div className="grid gap-px border-b border-line bg-line sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {/* Ячейка цены. */}
                <div className="bg-ink p-5">
                  {/* Подпись цены. */}
                  <p className="text-[10px] font-bold uppercase text-white/40">Цена</p>
                  {/* Текущая цена. */}
                  <strong className="mt-3 block text-4xl font-black leading-none">
                    {selectedCourse.price.formatted}
                  </strong>
                  {/* Старая цена со strike-through. */}
                  <span className="mt-2 block text-xs font-bold text-white/36 line-through">
                    {selectedCourse.oldPrice.formatted}
                  </span>
                </div>
                {/* Ячейка состава курса. */}
                <div className="bg-ink p-5">
                  {/* Подпись состава. */}
                  <p className="text-[10px] font-bold uppercase text-white/40">Состав</p>
                  {/* Количество уроков. */}
                  <strong className="mt-3 block text-4xl font-black leading-none text-acid">
                    {selectedCourse.lessonsLabel}
                  </strong>
                </div>
              </div>

              {/* Нижняя часть карточки: статус и действие. */}
              <div className="grid gap-5 p-5">
                {/* Текстовое объяснение текущего статуса доступа. */}
                <div className="border border-line p-4">
                  {/* Заголовок статуса. */}
                  <p className="text-xs font-black uppercase text-white">{access.title}</p>
                  {/* Описание статуса. */}
                  <p className="mt-3 text-xs leading-snug text-white/50">
                    {access.description}
                  </p>
                </div>

                {/* Если нужна оплата, показываем выбор метода; иначе — кнопку обучения. */}
                {needsPayment ? (
                  // Компонент оплаты получает цену и методы из серверной страницы.
                  <PaymentMethodSelector
                    methods={paymentMethods}
                    price={selectedCourse.price.formatted}
                  />
                ) : (
                  // Для открытого курса ведем пользователя в профиль/обучение.
                  <Link
                    className="inline-flex min-h-14 items-center justify-center border border-acid bg-acid px-5 text-xs font-black uppercase text-ink transition hover:bg-transparent hover:text-acid"
                    href="/profile"
                  >
                    Начать учиться
                  </Link>
                )}
              </div>
            </div>
          </aside>
        </section>

        {/* Нижний список курсов для быстрого переключения checkout-состояния. */}
        <section className="grid gap-px bg-line sm:grid-cols-3">
          {/* Рендерим ссылку для каждого курса. */}
          {courses.map((course) => (
            <Link
              // Активный курс подсвечивается кислотным цветом.
              className={`grid gap-4 p-5 transition ${
                course.slug === selectedCourse.slug
                  ? "bg-acid text-ink"
                  : "bg-ink text-white hover:bg-white/8"
              }`}
              // Query-параметр меняет выбранный курс без отдельной страницы под каждый курс.
              href={`/checkout?course=${course.slug}`}
              // key нужен React для списка.
              key={course.slug}
            >
              {/* Короткий статус курса. */}
              <span className="text-[10px] font-black uppercase opacity-70">
                {COURSE_ACCESS_COPY[course.access].label}
              </span>
              {/* Название курса. */}
              <strong className="text-xl font-black uppercase leading-[1.04]">
                {course.title}
              </strong>
              {/* Цена курса. */}
              <span className="text-xs font-bold uppercase opacity-70">
                {course.price.formatted}
              </span>
            </Link>
          ))}
        </section>
      </section>
    </main>
  );
}

// Маленький компонент для одной ячейки состояния доступа.
function AccessState({ state, active }: { state: CourseAccessStatus; active: boolean }) {
  // Достаем текст состояния по ключу open/locked/pending.
  const item = COURSE_ACCESS_COPY[state];

  // Возвращаем одну ячейку состояния.
  return (
    // Активная ячейка кислотная, остальные темные.
    <div className={active ? "bg-acid p-4 text-ink" : "bg-panel/95 p-4 text-white"}>
      {/* Техническая подпись состояния. */}
      <p className="text-[10px] font-black uppercase opacity-70">{item.label}</p>
      {/* Человеческий заголовок состояния. */}
      <h3 className="mt-8 text-lg font-black uppercase leading-tight">{item.title}</h3>
    </div>
  );
}
