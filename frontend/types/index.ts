// Код валюты ограничен теми валютами, которые сейчас реально показывает фронтенд.
export type CurrencyCode = "RUB";

// Статус доступа к курсу на checkout-экране.
export type CourseAccessStatus = "open" | "locked" | "pending";

// Статус курса внутри личного кабинета студента.
export type StudentCourseStatus = "active" | "completed" | "locked";

// Доступные способы оплаты в UI.
export type PaymentMethodId = "stars" | "crypto";

// Состояние mock-кнопки оплаты.
export type PaymentState = "idle" | "loading" | "ready" | "error";

// Роль пользователя из auth response. Backend может вернуть STUDENT или ROLE_USER.
export type AuthUserRole = "STUDENT" | "ROLE_USER" | "ROLE_ADMIN" | "ROLE_TUTOR" | string;

// Краткая информация о текущем пользователе.
export interface AuthUserDto {
  // ID пользователя из backend.
  id: number;
  // Username для отображения в навигации.
  username: string;
  // Email пользователя.
  email: string;
  // Роль пользователя.
  role: AuthUserRole;
}

// Payload регистрации.
export interface RegisterUserPayload {
  // Username: 3-32 символа, латиница/цифры/_.
  username: string;
  // Email пользователя.
  email: string;
  // Пароль не сохраняется на фронте.
  password: string;
}

// Payload входа.
export interface LoginUserPayload {
  // Username пользователя.
  username: string;
  // Пароль нужен только для запроса login и не сохраняется.
  password: string;
}

// Ответ auth endpoint.
export interface AuthResponseDto {
  // JWT/access token.
  accessToken: string;
  // Тип токена, обычно Bearer.
  tokenType: "Bearer" | string;
  // Краткая информация о пользователе.
  user: AuthUserDto;
}

// Коды auth-ошибок, которые UI показывает человекочитаемо.
export type AuthErrorCode =
  | "validation"
  | "backend"
  | "unauthorized"
  | "duplicate_username"
  | "duplicate_email"
  | "missing_token";

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
export interface CartResponseDto {
  courseIds: number[];
}

export interface CourseAccessResponseDto {
  access: boolean;
}

export interface LessonLearnResponseDto {
  lesson: AdminLessonDto;
  tasks: AdminTaskDto[];
}

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
  // Позиция модуля внутри курса.
  position: number;
}

// Payload для POST /api/courses/{courseId}/modules.
export interface AdminModuleCreatePayload {
  // Название модуля.
  name: string;
  // Описание модуля.
  description: string;
  // Позиция модуля внутри курса.
  position: number;
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
  // Позиция урока внутри модуля.
  position: number;
  // Основной материал урока в Markdown. Для неопубликованного урока backend возвращает null.
  contentMd: string | null;
  // Флаг публикации урока.
  published: boolean;
}

// Payload для POST /api/modules/{moduleId}/lessons.
export interface AdminLessonCreatePayload {
  // Название урока.
  name: string;
  // Описание урока.
  description: string;
  // Позиция урока внутри модуля.
  position: number;
  // Основной материал урока в Markdown.
  contentMd: string | null;
  // Флаг публикации урока.
  published: boolean;
}

// DTO задачи из backend TaskDTO.
export interface AdminTaskDto {
  // ID задачи из базы.
  id: number;
  // ID родительского урока.
  lessonId: number;
  // Тип задачи: CODE, TEST или NUMERIC.
  taskType: AdminTaskType;
  // Условие задачи в Markdown.
  statementMd: string;
  // Стартовый код, который CODE-задача показывает студенту.
  starterCode: string | null;
  // Ограничение времени CODE-задачи в миллисекундах.
  timeLimitMs: number | null;
  // Ограничение памяти CODE-задачи в килобайтах.
  memoryLimitKb: number | null;
  // Ограничение вывода CODE-задачи в килобайтах.
  outputLimitKb: number | null;
  // Версия набора приватных тестов CODE-задачи.
  testSetVersion: number | null;
  // Legacy-шаблон кода CODE-задачи; starterCode имеет приоритет в learner UI.
  templateCode: string | null;
  // Приватные тест-кейсы CODE-задачи. Learner UI не должен их отображать.
  testCases: string | null;
  // Варианты ответа для TEST-задачи.
  options: string[] | null;
  // Индексы правильных вариантов TEST-задачи. Learner UI не должен их отображать.
  correctOptionIndexes: number[] | null;
  // Правильный числовой ответ для NUMERIC-задачи.
  correctNumericAnswer: number | null;
}

// Payload для POST /api/lessons/{lessonId}/tasks.
export interface AdminTaskCreatePayload {
  // Тип создаваемой задачи.
  taskType: AdminTaskType;
  // Условие задачи в Markdown.
  statementMd: string;
  // Стартовый код для CODE-задачи.
  starterCode: string | null;
  // Ограничение времени CODE-задачи в миллисекундах.
  timeLimitMs: number | null;
  // Ограничение памяти CODE-задачи в килобайтах.
  memoryLimitKb: number | null;
  // Ограничение вывода CODE-задачи в килобайтах.
  outputLimitKb: number | null;
  // Версия набора приватных тестов CODE-задачи.
  testSetVersion: number | null;
  // Legacy-шаблон кода для CODE-задачи.
  templateCode: string | null;
  // Приватные тест-кейсы для CODE-задачи.
  testCases: string | null;
  // Варианты ответа для TEST-задачи.
  options: string[] | null;
  // Индексы правильных вариантов для TEST-задачи.
  correctOptionIndexes: number[] | null;
  // Правильный числовой ответ для NUMERIC-задачи.
  correctNumericAnswer: number | null;
}

// Learner DTO намеренно исключает приватные judge-тесты и правильные ответы.
export type LearnerTaskDto = Omit<
  AdminTaskDto,
  "testCases" | "correctOptionIndexes" | "correctNumericAnswer"
>;

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
  tasks: LearnerTaskDto[];
  // Основная задача урока для Sprint 2.
  primaryTask: LearnerTaskDto | null;
}

// Язык submission, который поддерживает Sprint 2 UI.
export type SubmissionLanguage = "CPP23";

// Актуальный worker status плюс legacy aliases на время совместимого rollout.
export type BackendSubmissionStatus =
  | "QUEUED"
  | "COMPILING"
  | "RUNNING"
  | "FINISHED"
  | "INFRA_ERROR"
  | "CANCELLED"
  | "COMPLETED"
  | "FAILED"
  | (string & {});

// Актуальные короткие verdicts плюс legacy длинные aliases.
export type BackendVerdict =
  | "AC"
  | "WA"
  | "CE"
  | "TLE"
  | "MLE"
  | "RE"
  | "OLE"
  | "ACCEPTED"
  | "WRONG_ANSWER"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "COMPILATION_ERROR"
  | "RUNTIME_ERROR"
  | "OUTPUT_LIMIT_EXCEEDED"
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
