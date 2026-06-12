// Link нужен для перехода на login-страницу из профиля.
import Link from "next/link";

// Профиль берется из сервисного слоя, чтобы позже заменить мок на backend API в одном месте.
import { getStudentProfile } from "@/services/api";

// Тип статуса курса нужен для строгого словаря русских подписей.
import type { StudentCourseStatus } from "@/types";

// Словарь русских подписей для статусов курса.
const statusLabels: Record<StudentCourseStatus, string> = {
  // Активный курс.
  active: "Активен",
  // Завершенный курс.
  completed: "Пройден",
  // Закрытый курс.
  locked: "Закрыт"
};

// Страница профиля.
export default async function ProfilePage() {
  // Получаем анонимный профиль через services/api.ts.
  const profile = await getStudentProfile();

  // Разделяем профиль на статистику и курсы для более коротких обращений в JSX.
  const { courses, stats } = profile;

  // Форматируем счетчик решенных задач в виде "42 / 150".
  const solvedLabel = `${stats.solvedTasks} / ${stats.totalTasks}`;

  // Считаем открытые курсы прямо из данных профиля, чтобы UI не хранил отдельную цифру.
  const openCoursesLabel = String(
    courses.filter((course) => course.status !== "locked").length
  ).padStart(2, "0");

  // Считаем оставшиеся задачи на основе общей статистики.
  const remainingTasksLabel = String(stats.totalTasks - stats.solvedTasks);

  // Возвращаем JSX-разметку профиля.
  return (
    // main задает минимальную высоту и внешние отступы страницы.
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      {/* Основной контейнер профиля. */}
      <section className="mx-auto max-w-7xl border border-line bg-ink/90">
        {/* Шапка профиля. */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-5 sm:px-7">
          {/* Левая часть шапки: подпись и заголовок. */}
          <div>
            {/* Техническая подпись страницы. */}
            <p className="font-mono text-xs font-bold uppercase text-acid">
              anonymous student profile
            </p>
            {/* Главный заголовок профиля. */}
            <h1 className="mt-3 max-w-4xl text-4xl font-black uppercase leading-[1.04] sm:text-6xl lg:text-7xl">
              Учебная статистика
            </h1>
          </div>

          {/* Карточка текущего ранга. */}
          <div className="border border-acid px-4 py-3 text-right font-mono text-xs uppercase text-acid">
            {/* Подпись ранга. */}
            <span className="block text-white/50">Current rank</span>
            {/* Значение ранга. */}
            <strong className="text-lg text-acid">{stats.rank}</strong>
          </div>

          {/* Ссылка на страницу входа. */}
          <Link
            className="border border-line px-4 py-3 font-mono text-xs font-bold uppercase text-white/48 transition hover:border-acid hover:text-acid"
            href="/login"
          >
            Login
          </Link>
        </header>

        {/* Верхний блок статистики и карты обучения. */}
        <section className="grid border-b border-line lg:grid-cols-[1.05fr_0.95fr]">
          {/* Левая колонка со счетчиками и уровнем. */}
          <div className="grid gap-5 border-b border-line p-5 sm:p-7 lg:border-b-0 lg:border-r">
            {/* Три главных показателя студента. */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Количество решенных задач. */}
              <StatBlock label="Решено задач" value={solvedLabel} />
              {/* Средний прогресс. */}
              <StatBlock label="Средний прогресс" value={`${stats.averageProgress}%`} />
              {/* Серия дней. */}
              <StatBlock label="Серия дней" value={`${stats.streak}`} />
            </div>

            {/* Блок текущего уровня и общего прогрессбара. */}
            <div className="border border-line bg-panel p-5">
              {/* Строка заголовка уровня и процента. */}
              <div className="mb-4 flex items-end justify-between gap-4">
                {/* Название текущего уровня. */}
                <div>
                  {/* Подпись уровня. */}
                  <p className="font-mono text-xs font-bold uppercase text-white/48">
                    current level
                  </p>
                  {/* Значение уровня. */}
                  <h2 className="mt-2 text-3xl font-black uppercase leading-none sm:text-5xl">
                    {stats.level}
                  </h2>
                </div>
                {/* Процент среднего прогресса. */}
                <span className="font-mono text-sm font-bold text-acid">
                  {stats.averageProgress}%
                </span>
              </div>
              {/* Общий прогрессбар. */}
              <ProgressBar value={stats.averageProgress} />
            </div>
          </div>

          {/* Правая колонка с обзором карты обучения. */}
          <div className="grid content-between gap-8 p-5 sm:p-7">
            {/* Заголовок learning map. */}
            <div>
              {/* Маленькая подпись. */}
              <p className="font-mono text-xs font-bold uppercase text-acid">
                learning map
              </p>
              {/* Большой текстовый блок. */}
              <h2 className="mt-3 text-3xl font-black uppercase leading-[1.04] sm:text-5xl">
                Активные курсы и прогресс без персональных данных.
              </h2>
            </div>
            {/* Две маленькие метрики карты обучения. */}
            <div className="grid grid-cols-2 gap-px border border-line bg-line">
              {/* Количество открытых курсов. */}
              <MiniMetric label="Курсов открыто" value={openCoursesLabel} />
              {/* Количество оставшихся задач. */}
              <MiniMetric label="Задач осталось" value={remainingTasksLabel} />
            </div>
          </div>
        </section>

        {/* Секция списка курсов пользователя. */}
        <section className="p-5 sm:p-7">
          {/* Заголовок секции "Мои курсы". */}
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            {/* Левая часть заголовка. */}
            <div>
              {/* Маленькая подпись. */}
              <p className="font-mono text-xs font-bold uppercase text-acid">
                purchased / active
              </p>
              {/* Название секции. */}
              <h2 className="mt-2 text-3xl font-black uppercase sm:text-5xl">
                Мои курсы
              </h2>
            </div>
            {/* Количество курсов в списке. */}
            <span className="font-mono text-xs font-bold uppercase text-white/48">
              {courses.length} courses
            </span>
          </div>

          {/* Список курсов, разделенный тонкими линиями. */}
          <div className="grid gap-px border border-line bg-line">
            {/* map превращает массив courses в строки списка. */}
            {courses.map((course, index) => (
              // Одна строка курса.
              <article
                className="grid gap-5 bg-ink p-5 sm:grid-cols-[64px_1fr_220px] sm:p-6"
                key={course.title}
              >
                {/* Порядковый номер курса. */}
                <div className="font-mono text-sm font-black text-white/48">
                  {String(index + 1).padStart(2, "0")}
                </div>

                {/* Текстовая часть строки курса. */}
                <div className="min-w-0">
                  {/* Название курса и бейдж статуса. */}
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    {/* Название курса. */}
                    <h3 className="text-2xl font-black uppercase leading-[1.04] sm:text-4xl">
                      {course.title}
                    </h3>
                    {/* Бейдж статуса курса. */}
                    <StatusPill status={course.status} />
                  </div>
                  {/* Уровень и следующий урок. */}
                  <p className="max-w-2xl text-base leading-snug text-white/62">
                    {course.level} / {course.nextLesson}
                  </p>
                </div>

                {/* Правая часть строки курса: счетчик и прогрессбар. */}
                <div className="grid content-between gap-4">
                  {/* Строка статуса и решенных задач. */}
                  <div className="flex items-center justify-between gap-4 font-mono text-xs font-bold uppercase text-white/50">
                    {/* Русская подпись статуса. */}
                    <span>{statusLabels[course.status]}</span>
                    {/* Счетчик задач внутри курса. */}
                    <span>
                      {course.solvedTasks} / {course.totalTasks}
                    </span>
                  </div>
                  {/* Прогрессбар курса; locked-курс получает muted-цвет. */}
                  <ProgressBar value={course.progressPercent} muted={course.status === "locked"} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

// Маленькая карточка статистики.
function StatBlock({ label, value }: { label: string; value: string }) {
  // Возвращаем ячейку с подписью и крупным значением.
  return (
    <div className="border border-line bg-panel/95 p-4">
      {/* Подпись метрики. */}
      <p className="font-mono text-xs font-bold uppercase text-white/48">{label}</p>
      {/* Значение метрики. */}
      <strong className="mt-5 block text-3xl font-black uppercase leading-none sm:text-4xl">
        {value}
      </strong>
    </div>
  );
}

// Маленькая ячейка для learning map.
function MiniMetric({ label, value }: { label: string; value: string }) {
  // Возвращаем компактную метрику.
  return (
    <div className="bg-panel/95 p-4">
      {/* Подпись метрики. */}
      <p className="font-mono text-[10px] font-bold uppercase text-white/48">{label}</p>
      {/* Значение метрики кислотным цветом. */}
      <strong className="mt-4 block text-4xl font-black leading-none text-acid">{value}</strong>
    </div>
  );
}

// Компонент прогрессбара.
function ProgressBar({ value, muted = false }: { value: number; muted?: boolean }) {
  // Возвращаем доступный progressbar с aria-атрибутами.
  return (
    <div
      // Текст для screen reader.
      aria-label={`Прогресс ${value}%`}
      // Внешняя рамка прогрессбара.
      className="h-3 overflow-hidden border border-line bg-white/6"
      // Семантическая роль прогрессбара.
      role="progressbar"
      // Минимальное значение прогресса.
      aria-valuemin={0}
      // Максимальное значение прогресса.
      aria-valuemax={100}
      // Текущее значение прогресса.
      aria-valuenow={value}
    >
      {/* Внутренняя полоска: ширина зависит от value. */}
      <div
        // muted делает прогрессбар неактивным для закрытого курса.
        className={muted ? "h-full bg-white/24" : "h-full bg-acid"}
        // Inline style нужен для динамической ширины в процентах.
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// Бейдж статуса курса.
function StatusPill({ status }: { status: StudentCourseStatus }) {
  // Словарь CSS-классов для разных статусов.
  const styles: Record<StudentCourseStatus, string> = {
    // Активный курс подсвечиваем кислотным цветом.
    active: "border-acid text-acid",
    // Завершенный курс делаем белым.
    completed: "border-white/50 text-white",
    // Закрытый курс приглушаем.
    locked: "border-white/20 text-white/38"
  };

  // Возвращаем сам бейдж.
  return (
    <span
      // Общие классы + классы конкретного статуса.
      className={`border px-2 py-1 font-mono text-[10px] font-bold uppercase ${styles[status]}`}
    >
      {/* Русская подпись статуса. */}
      {statusLabels[status]}
    </span>
  );
}
