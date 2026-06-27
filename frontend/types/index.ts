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

// Тип задачи из backend enum TaskType.
export type AdminTaskType = "TEST" | "CODE" | "NUMERIC";

// DTO курса из backend CourseDTO.
export interface AdminCourseDto {
  // ID курса из базы.
  id: number;
  // Название курса.
  name: string;
  // Описание курса.
  description: string;
  // Цена в обычной валюте, backend хранит BigDecimal.
  price: number | null;
  // Цена в Telegram Stars, backend хранит BigDecimal.
  priceInStars: number | null;
}

// Payload для POST /api/courses.
export interface AdminCourseCreatePayload {
  // Название курса.
  name: string;
  // Описание курса.
  description: string;
  // Цена в обычной валюте.
  price: number | null;
  // Цена в Telegram Stars.
  priceInStars: number | null;
}

// DTO модуля из backend ModuleDTO.
export interface AdminModuleDto {
  // ID модуля из базы.
  id: number;
  // ID родительского курса.
  courseId: number;
  // Название модуля.
  name: string;
  // Описание модуля.
  description: string;
}

// Payload для POST /api/courses/{courseId}/modules.
export interface AdminModuleCreatePayload {
  // Название модуля.
  name: string;
  // Описание модуля.
  description: string;
}

// DTO урока из backend LessonDTO.
export interface AdminLessonDto {
  // ID урока из базы.
  id: number;
  // ID родительского модуля.
  moduleId: number;
  // Название урока.
  name: string;
  // Описание урока.
  description: string;
}

// Payload для POST /api/modules/{moduleId}/lessons.
export interface AdminLessonCreatePayload {
  // Название урока.
  name: string;
  // Описание урока.
  description: string;
}

// DTO задачи из backend TaskDTO.
export interface AdminTaskDto {
  // ID задачи из базы.
  id: number;
  // ID родительского урока.
  lessonId: number;
  // Тип задачи: CODE, TEST или NUMERIC.
  taskType: AdminTaskType;
  // Условие задачи.
  taskText: string;
  // Шаблон кода для CODE-задачи.
  templateCode: string | null;
  // Тест-кейсы для CODE-задачи.
  testCases: string | null;
  // Варианты ответа для TEST-задачи.
  options: string[] | null;
  // Индекс правильного варианта для TEST-задачи.
  correctOptionIndex: number | null;
  // Правильный числовой ответ для NUMERIC-задачи.
  correctNumericAnswer: number | null;
}

// Payload для POST /api/lessons/{lessonId}/tasks.
export interface AdminTaskCreatePayload {
  // Тип задачи, в Sprint 2 UI создает CODE.
  taskType: AdminTaskType;
  // Условие задачи.
  taskText: string;
  // Шаблон кода для CODE-задачи.
  templateCode: string | null;
  // Тест-кейсы для CODE-задачи.
  testCases: string | null;
  // Варианты ответа для TEST-задачи.
  options: string[] | null;
  // Индекс правильного варианта для TEST-задачи.
  correctOptionIndex: number | null;
  // Правильный числовой ответ для NUMERIC-задачи.
  correctNumericAnswer: number | null;
}

// Модуль курса вместе с уроками, которые нужны странице курса.
export interface CourseModuleWithLessonsDto {
  // Данные модуля из backend.
  module: AdminModuleDto;
  // Уроки только этого модуля.
  lessons: AdminLessonDto[];
}

// Полная структура страницы курса.
export interface CourseLearningViewDto {
  // Курс из backend CourseDTO.
  course: AdminCourseDto;
  // Курс, замаппленный под витринные карточки.
  catalogCourse: CourseDto;
  // Номер курса в текущем backend-каталоге.
  courseIndex: number;
  // Флаг доступности в Sprint 2: первым курсом можно пользоваться, остальные скоро.
  isAvailable: boolean;
  // Модули и уроки выбранного курса.
  modules: CourseModuleWithLessonsDto[];
  // Первый доступный урок для CTA.
  firstLesson: AdminLessonDto | null;
}

// Полная структура страницы урока.
export interface LessonLearningViewDto {
  // Родительский курс урока.
  course: AdminCourseDto;
  // Номер курса в текущем backend-каталоге.
  courseIndex: number;
  // Флаг доступности курса в пользовательском пути Sprint 2.
  isCourseAvailable: boolean;
  // Родительский модуль урока.
  module: AdminModuleDto;
  // Сам урок.
  lesson: AdminLessonDto;
  // Задачи урока.
  tasks: AdminTaskDto[];
  // Основная задача урока для Sprint 2.
  primaryTask: AdminTaskDto | null;
}

// Язык submission, который поддерживает Sprint 2 UI.
export type SubmissionLanguage = "CPP23";

// Backend-статус submission из enum SubmissionStatus плюс безопасная неизвестная строка.
export type BackendSubmissionStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | (string & {});

// Verdict из backend enum Verdict плюс безопасная неизвестная строка.
export type BackendVerdict =
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "COMPILATION_ERROR"
  | "RUNTIME_ERROR"
  | (string & {});

// Payload для POST /api/tasks/{taskId}/submissions.
export interface SubmissionCreatePayload {
  // Язык решения.
  language: SubmissionLanguage;
  // Исходный код решения.
  sourceCode: string;
}

// Ответ backend на создание submission.
export interface SubmissionCreatedResponseDto {
  // UUID submission.
  id: string;
  // Начальный статус очереди.
  status: BackendSubmissionStatus;
}

// Полный ответ backend на GET /api/submissions/{id}.
export interface SubmissionResponseDto {
  // UUID submission.
  id: string;
  // ID задачи, к которой относится submission.
  taskId: number;
  // Язык решения.
  language: SubmissionLanguage | string;
  // Текущий backend-статус.
  status: BackendSubmissionStatus;
  // Verdict после завершения, пока может быть null.
  verdict: BackendVerdict | null;
  // Время выполнения в миллисекундах, если backend уже знает значение.
  executionTime: number | null;
  // Память в килобайтах/байтах по backend-контракту, если значение есть.
  memoryUsed: number | null;
  // Безопасное сообщение backend: compiler log, ошибка или пояснение.
  safeMessage: string | null;
  // Дата создания submission как строка LocalDateTime.
  createdAt: string;
}
