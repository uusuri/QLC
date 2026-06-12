// Код валюты ограничен теми валютами, которые сейчас реально показывает фронтенд.
export type CurrencyCode = "RUB";

// Статус доступа к курсу на checkout-экране.
export type CourseAccessStatus = "open" | "locked" | "pending";

// Статус курса внутри личного кабинета студента.
export type StudentCourseStatus = "active" | "completed" | "locked";

// Доступные способы оплаты в UI.
export type PaymentMethodId = "stars" | "crypto";

// Состояние mock-кнопки оплаты.
export type PaymentState = "idle" | "loading" | "ready";

// Состояние mock-кнопки авторизации.
export type LoginState = "idle" | "loading" | "ready";

// Денежное значение для курса.
export interface MoneyDto {
  // Числовая сумма пригодится для будущей передачи в платежный API.
  amount: number;
  // Валюта суммы.
  currency: CurrencyCode;
  // Готовая строка для отображения в интерфейсе.
  formatted: string;
}

// Курс в каталоге и на checkout-странице.
export interface CourseDto {
  // Стабильный URL-ключ курса.
  slug: string;
  // Название курса.
  title: string;
  // Краткое описание курса.
  description: string;
  // Изображение карточки курса.
  imageUrl: string;
  // Короткая маркетинговая метка на карточке.
  badge: string;
  // Количество уроков числом.
  lessonsCount: number;
  // Готовая подпись количества уроков для UI.
  lessonsLabel: string;
  // Текущая цена.
  price: MoneyDto;
  // Старая цена для показа скидки.
  oldPrice: MoneyDto;
  // Статус доступа к курсу.
  access: CourseAccessStatus;
}

// Текстовое описание состояния доступа к курсу.
export interface CourseAccessCopyDto {
  // Техническая подпись состояния.
  label: string;
  // Короткий заголовок состояния.
  title: string;
  // Пояснение для пользователя.
  description: string;
}

// Общая статистика студента.
export interface StudentStatsDto {
  // Сколько задач студент решил.
  solvedTasks: number;
  // Сколько задач всего доступно в системе.
  totalTasks: number;
  // Средний прогресс активных курсов.
  averageProgress: number;
  // Текущий ранг в системе геймификации.
  rank: string;
  // Название текущего уровня.
  level: string;
  // Серия дней обучения.
  streak: number;
}

// Прогресс конкретного курса в личном кабинете.
export interface StudentCourseProgressDto {
  // Ссылка на исходный курс из каталога.
  courseSlug: string;
  // Название курса.
  title: string;
  // Статус курса в кабинете.
  status: StudentCourseStatus;
  // Сколько задач решено внутри курса.
  solvedTasks: number;
  // Сколько задач всего внутри курса.
  totalTasks: number;
  // Процент прохождения курса.
  progressPercent: number;
  // Текущий уровень/трек внутри курса.
  level: string;
  // Следующий урок или состояние курса.
  nextLesson: string;
}

// Профиль студента без личных данных.
export interface StudentProfileDto {
  // Сводная статистика студента.
  stats: StudentStatsDto;
  // Список купленных, активных и закрытых курсов.
  courses: StudentCourseProgressDto[];
}

// Способ оплаты на checkout-странице.
export interface PaymentMethodDto {
  // ID метода нужен для логики выбора.
  id: PaymentMethodId;
  // Название метода в UI.
  title: string;
  // Краткое описание метода.
  description: string;
  // Бейдж справа в карточке метода.
  tag: string;
  // Флаг готовности метода к оплате.
  enabled: boolean;
}

// Короткий тезис на экране входа.
export interface LoginNoteDto {
  // Стабильный ключ тезиса.
  id: string;
  // Текст тезиса.
  title: string;
}
