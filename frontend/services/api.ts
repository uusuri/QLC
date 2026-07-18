// Общие типы фронтенда лежат отдельно, чтобы страницы не дублировали контракты данных.
import type {
  AdminCourseCreatePayload,
  AdminCourseDto,
  AdminLessonCreatePayload,
  AdminLessonDto,
  AdminModuleCreatePayload,
  AdminModuleDto,
  AdminTaskCreatePayload,
  AdminTaskDto,
  AuthErrorCode,
  AuthResponseDto,
  AuthUserDto,
  CourseLearningViewDto,
  CourseAccessCopyDto,
  CourseAccessStatus,
  CourseDto,
  LessonLearningViewDto,
  LearnerTaskDto,
  LoginUserPayload,
  LoginNoteDto,
  PaymentMethodDto,
  RegisterUserPayload,
  SubmissionCreatePayload,
  SubmissionCreatedResponseDto,
  SubmissionResponseDto,
  StudentProfileDto
} from "@/types";

// Базовый URL backend API. В dev по умолчанию Spring Boot живет на 127.0.0.1:8080.
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8080").replace(
  /\/$/,
  ""
);

// Ключи localStorage для Sprint 2 auth state.
const AUTH_TOKEN_STORAGE_KEY = "qlc:auth-token";
const AUTH_USER_STORAGE_KEY = "qlc:auth-user";
const AUTH_CHANGE_EVENT = "qlc-auth-change";

// Расширяем RequestInit флагом auth, чтобы не размазывать Authorization header по компонентам.
type ApiRequestOptions = RequestInit & {
  // auth=true добавляет Authorization: Bearer {token}, если токен есть.
  auth?: boolean;
};

// Ошибка auth-service с кодом для UI.
export class AuthClientError extends Error {
  // code позволяет форме показать понятное состояние.
  code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "AuthClientError";
  }
}

// Дефолтная картинка нужна, потому что backend CourseDTO пока не содержит imageUrl.
const DEFAULT_COURSE_IMAGE_URL =
  "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80";

// Объектная проверка для безопасного чтения неизвестного JSON из ошибок backend.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Возвращает строковое поле из JSON-ошибки, если оно реально является строкой.
function getStringField(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === "string" ? value : undefined;
}

// Достает понятный текст ошибки из ответа backend.
async function readErrorMessage(response: Response): Promise<string> {
  // Backend может вернуть JSON ErrorDTO, стандартную Spring-ошибку или plain text.
  const text = await response.text();

  // Пустой body тоже превращаем в читабельную ошибку.
  if (!text) {
    return `Backend error ${response.status} ${response.statusText}`;
  }

  try {
    // JSON.parse возвращает unknown, поэтому ниже идут строгие проверки формы.
    const parsed: unknown = JSON.parse(text);

    if (isRecord(parsed)) {
      return (
        getStringField(parsed, "message") ??
        getStringField(parsed, "error") ??
        getStringField(parsed, "detail") ??
        text
      );
    }
  } catch {
    // Если это не JSON, ниже вернем исходный текст.
  }

  return text;
}

// Единая обертка над fetch для admin/API-запросов.
async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<TResponse> {
  // auth — наш внутренний флаг, в fetch его передавать нельзя.
  const { auth = false, ...requestOptions } = options;

  // Headers умеет принимать любые допустимые варианты RequestInit.headers.
  const headers = new Headers(requestOptions.headers);

  // JSON — общий формат текущих backend DTO.
  headers.set("Content-Type", "application/json");

  // Protected frontend calls могут добавить Bearer token из localStorage.
  if (auth) {
    const token = getAuthToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  // Собираем абсолютный URL, чтобы frontend на 3000 ходил в Spring Boot на 8080.
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    cache: "no-store",
    headers
  });

  // Ошибки backend превращаем в Error, чтобы UI мог показать error state.
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  // Для текущих GET/POST backend всегда возвращает JSON DTO.
  return (await response.json()) as TResponse;
}

// Статичный каталог оставлен только для будущих локальных fallback-сценариев вне основного пути.
const courseCatalogMock: CourseDto[] = [
  // Первый курс в витрине и checkout.
  {
    slug: "frontend-typescript",
    title: "Frontend TypeScript",
    description:
      "Компоненты, состояние, типизация, архитектура интерфейса и сборка проекта на современном фронте.",
    imageUrl:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80",
    badge: "bestseller",
    lessonsCount: 38,
    lessonsLabel: "38 уроков",
    price: {
      amount: 4900,
      currency: "RUB",
      formatted: "4 900 ₽"
    },
    oldPrice: {
      amount: 9800,
      currency: "RUB",
      formatted: "9 800 ₽"
    },
    access: "locked"
  },
  // Второй курс в витрине и checkout.
  {
    slug: "web-design-system",
    title: "Web Design System",
    description:
      "Сетка, типографика, компоненты, визуальная дисциплина и premium tech стиль без лишнего шума.",
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    badge: "visual core",
    lessonsCount: 24,
    lessonsLabel: "24 урока",
    price: {
      amount: 3700,
      currency: "RUB",
      formatted: "3 700 ₽"
    },
    oldPrice: {
      amount: 7400,
      currency: "RUB",
      formatted: "7 400 ₽"
    },
    access: "open"
  },
  // Третий курс в витрине и checkout.
  {
    slug: "landing-that-sells",
    title: "Landing That Sells",
    description:
      "Оффер, структура страницы, блоки доверия, цена, CTA и быстрый запуск витрины под продажи.",
    imageUrl:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
    badge: "launch",
    lessonsCount: 31,
    lessonsLabel: "31 урок",
    price: {
      amount: 5500,
      currency: "RUB",
      formatted: "5 500 ₽"
    },
    oldPrice: {
      amount: 11000,
      currency: "RUB",
      formatted: "11 000 ₽"
    },
    access: "pending"
  }
];

// Приводит backend BigDecimal/number к безопасной сумме для карточки.
function normalizeMoneyAmount(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

// Форматирует рублевую цену для UI-карточки.
function formatRubPrice(value: number | string | null | undefined) {
  const amount = normalizeMoneyAmount(value);

  return {
    amount,
    currency: "RUB" as const,
    formatted: new Intl.NumberFormat("ru-RU", {
      currency: "RUB",
      maximumFractionDigits: 0,
      style: "currency"
    }).format(amount)
  };
}

// Достает backend ID из fallback slug вида course-{id}.
function parseCourseIdFromSlug(slug: string): number | null {
  const match = /^course-(\d+)$/.exec(slug);

  if (!match) {
    return null;
  }

  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// Проверяет, доступен ли browser localStorage.
function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

// Уведомляет клиентские компоненты, что auth state изменился.
function emitAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

// Сохраняет auth session в localStorage.
function setAuthSession(response: AuthResponseDto) {
  setAuthToken(response.accessToken);

  if (canUseLocalStorage()) {
    window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(response.user));
  }

  emitAuthChange();
}

// Маппит backend CourseDTO в frontend CourseDto, который ожидает главная витрина.
function mapAdminCourseToCatalogCourse(course: AdminCourseDto): CourseDto {
  const price = formatRubPrice(course.price);
  const oldPrice = formatRubPrice(price.amount > 0 ? price.amount * 2 : null);

  return {
    slug: `course-${course.id}`,
    title: course.name,
    description: course.description || "Описание курса скоро появится.",
    imageUrl: DEFAULT_COURSE_IMAGE_URL,
    badge: "course",
    lessonsCount: 0,
    lessonsLabel: "0 уроков",
    price,
    oldPrice,
    access: price.amount > 0 ? "locked" : "open"
  };
}

// Удаляет приватные judge-поля до сериализации server component в браузер.
function mapAdminTaskToLearnerTask(task: AdminTaskDto): LearnerTaskDto {
  return {
    id: task.id,
    lessonId: task.lessonId,
    taskType: task.taskType,
    statementMd: task.statementMd,
    starterCode: task.starterCode,
    timeLimitMs: task.timeLimitMs,
    memoryLimitKb: task.memoryLimitKb,
    outputLimitKb: task.outputLimitKb,
    testSetVersion: task.testSetVersion,
    templateCode: task.templateCode,
    options: task.options
  };
}

// TODO: Интегрировать с бэком, когда появится эндпоинт профиля студента.
// Профиль анонимный: без имени, фамилии, аватарки и других персональных данных.
const studentProfileMock: StudentProfileDto = {
  stats: {
    solvedTasks: 42,
    totalTasks: 150,
    averageProgress: 38,
    rank: "RANK 04",
    level: "Interface Runner",
    streak: 9
  },
  courses: [
    // Активный курс.
    {
      courseSlug: "frontend-typescript",
      title: "Frontend TypeScript",
      status: "active",
      solvedTasks: 18,
      totalTasks: 42,
      progressPercent: 43,
      level: "Middle Track",
      nextLesson: "State, effects, data flow"
    },
    // Еще один активный курс.
    {
      courseSlug: "web-design-system",
      title: "Web Design System",
      status: "active",
      solvedTasks: 14,
      totalTasks: 36,
      progressPercent: 39,
      level: "Visual Core",
      nextLesson: "Spacing scale and layout rhythm"
    },
    // Завершенный курс.
    {
      courseSlug: "landing-that-sells",
      title: "Landing That Sells",
      status: "completed",
      solvedTasks: 10,
      totalTasks: 10,
      progressPercent: 100,
      level: "Launch Ready",
      nextLesson: "Final project archived"
    },
    // Закрытый курс без доступа.
    {
      courseSlug: "cpp-sandbox-basics",
      title: "C++ Sandbox Basics",
      status: "locked",
      solvedTasks: 0,
      totalTasks: 62,
      progressPercent: 0,
      level: "Locked",
      nextLesson: "Requires course access"
    }
  ]
};

// Тексты состояний доступа вынесены из checkout-страницы, чтобы UI не держал доменную копию.
export const COURSE_ACCESS_COPY: Record<CourseAccessStatus, CourseAccessCopyDto> = {
  // Курс уже доступен.
  open: {
    label: "course open",
    title: "Курс открыт",
    description: "Доступ уже активирован. Можно сразу продолжить обучение."
  },
  // Курс закрыт и требует оплаты.
  locked: {
    label: "payment required",
    title: "Требуется оплата",
    description: "После успешного платежа backend откроет доступ к материалам курса."
  },
  // Платеж создан или ожидает обработки.
  pending: {
    label: "payment pending",
    title: "Платеж готовится",
    description: "Состояние под будущую обработку платежа и ожидание подтверждения."
  }
};

// TODO: Интегрировать с бэком, когда появится эндпоинт методов оплаты.
// Telegram Stars оставлен основным методом, crypto пока отображается как будущий шлюз.
const paymentMethodsMock: PaymentMethodDto[] = [
  // Основной способ оплаты для цифрового курса внутри Telegram.
  {
    id: "stars",
    title: "Telegram Stars",
    description: "Основной способ оплаты цифрового курса внутри Telegram.",
    tag: "primary",
    enabled: true
  },
  // Будущий способ оплаты, пока без реального backend-шлюза.
  {
    id: "crypto",
    title: "Криптовалюта",
    description: "Зарезервировано под будущий платежный шлюз.",
    tag: "soon",
    enabled: false
  }
];

// Тезисы для login-экрана не требуют backend, но лежат рядом с остальными UI-данными.
const loginNotesMock: LoginNoteDto[] = [
  // Первый тезис: обычный username/password login для MVP.
  {
    id: "username-password",
    title: "username и пароль"
  },
  // Второй тезис: token живет локально на фронте.
  {
    id: "local-token",
    title: "токен хранится локально"
  },
  // Третий тезис: submission отправляется с Authorization header.
  {
    id: "authorized-submission",
    title: "submission только после входа"
  }
];

// Возвращает имя события, на которое могут подписаться client-компоненты.
export function getAuthChangeEventName() {
  return AUTH_CHANGE_EVENT;
}

// Возвращает текущий access token из localStorage.
export function getAuthToken(): string | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

// Сохраняет access token в localStorage.
export function setAuthToken(token: string) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  }
}

// Удаляет access token и user summary.
export function clearAuthToken() {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  }

  emitAuthChange();
}

// Регистрирует пользователя через backend AuthController и сохраняет реальный JWT.
export async function registerUser(payload: RegisterUserPayload): Promise<AuthResponseDto> {
  const response = await apiRequest<AuthResponseDto>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
      username: payload.username.trim()
    })
  });

  setAuthSession(response);
  return response;
}

// Выполняет login через backend AuthController и сохраняет реальный JWT.
export async function loginUser(payload: LoginUserPayload): Promise<AuthResponseDto> {
  const response = await apiRequest<AuthResponseDto>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      password: payload.password,
      username: payload.username.trim()
    })
  });

  setAuthSession(response);
  return response;
}

// Возвращает текущего пользователя через GET /api/auth/me с реальным JWT.
export async function getCurrentUser(): Promise<AuthUserDto | null> {
  if (!getAuthToken()) {
    return null;
  }

  try {
    return await apiRequest<AuthUserDto>("/api/auth/me", { auth: true });
  } catch {
    clearAuthToken();
    return null;
  }
}

// Выполняет logout на фронте.
export function logoutUser() {
  clearAuthToken();
}

// Возвращает каталог курсов для главной и checkout-страницы.
export async function getCourseCatalog(): Promise<CourseDto[]> {
  // Основной сценарий: витрина и checkout берут курсы из backend/БД.
  const courses = await getAdminCourses();
  return courses.map(mapAdminCourseToCatalogCourse);
}

// Возвращает статичный каталог только для будущих локальных fallback/debug-сценариев.
export function getStaticCourseCatalog(): CourseDto[] {
  return courseCatalogMock;
}

// Возвращает курс по slug или null, если slug отсутствует/не найден.
export async function getCourseBySlug(slug?: string): Promise<CourseDto | null> {
  const courses = await getCourseCatalog();
  return courses.find((course) => course.slug === slug) ?? null;
}

// Собирает страницу курса: сам курс, модули, уроки и первый доступный урок.
export async function getCourseLearningView(slug: string): Promise<CourseLearningViewDto | null> {
  const courseId = parseCourseIdFromSlug(slug);

  if (courseId === null) {
    return null;
  }

  const courses = await getAdminCourses();
  const courseIndex = courses.findIndex((course) => course.id === courseId);
  const course = courseIndex >= 0 ? courses[courseIndex] : null;

  if (!course) {
    return null;
  }

  const modules = await getAdminModules(course.id);
  const modulesWithLessons = await Promise.all(
    modules.map(async (module) => ({
      module,
      // Backend возвращает и опубликованные уроки, и черновики.
      // Страница курса должна показывать всю структуру, поэтому здесь нельзя
      // отбрасывать published: false: новые уроки создаются именно с таким статусом.
      lessons: await getAdminLessons(module.id)
    }))
  );
  // Главная CTA открывает только опубликованный урок, содержимое которого backend не скрывает.
  const firstLesson =
    modulesWithLessons.flatMap((item) => item.lessons).find((lesson) => lesson.published) ?? null;

  return {
    course,
    catalogCourse: mapAdminCourseToCatalogCourse(course),
    courseIndex,
    isAvailable: courseIndex === 0,
    modules: modulesWithLessons,
    firstLesson
  };
}

// Собирает страницу урока: урок, родительский модуль/курс и задачи урока.
export async function getLessonLearningView(id: number): Promise<LessonLearningViewDto | null> {
  const lesson = await getAdminLessonById(id);
  const module = await getAdminModuleById(lesson.moduleId);
  const course = await getAdminCourseById(module.courseId);
  const courses = await getAdminCourses();
  const courseIndex = courses.findIndex((item) => item.id === course.id);
  const tasks = lesson.published
    ? (await getAdminTasks(lesson.id)).map(mapAdminTaskToLearnerTask)
    : [];

  return {
    course,
    courseIndex,
    isCourseAvailable: courseIndex === 0,
    lesson,
    module,
    primaryTask: tasks[0] ?? null,
    tasks
  };
}

// Возвращает анонимный профиль студента для личного кабинета.
export async function getStudentProfile(): Promise<StudentProfileDto> {
  // TODO: Интегрировать с бэком, когда появится эндпоинт GET /api/profile.
  return studentProfileMock;
}

// Возвращает доступные способы оплаты для checkout.
export async function getPaymentMethods(): Promise<PaymentMethodDto[]> {
  // TODO: Интегрировать с бэком, когда появится эндпоинт GET /api/payments/methods.
  return paymentMethodsMock;
}

// Возвращает тезисы для минималистичного login-экрана.
export async function getLoginNotes(): Promise<LoginNoteDto[]> {
  return loginNotesMock;
}

// Загружает список курсов из текущего backend CourseController.
export async function getAdminCourses(): Promise<AdminCourseDto[]> {
  return apiRequest<AdminCourseDto[]>("/api/courses");
}

// Загружает один курс по backend ID.
export async function getAdminCourseById(id: number): Promise<AdminCourseDto> {
  return apiRequest<AdminCourseDto>(`/api/courses/${id}`);
}

// Создает курс через POST /api/courses.
export async function createAdminCourse(
  payload: AdminCourseCreatePayload
): Promise<AdminCourseDto> {
  return apiRequest<AdminCourseDto>("/api/courses", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// Обновляет выбранный курс через текущий PUT CourseController.
export async function updateAdminCourse(
  id: number,
  payload: AdminCourseCreatePayload
): Promise<AdminCourseDto> {
  return apiRequest<AdminCourseDto>(`/api/courses/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

// Загружает модули только для выбранного курса.
export async function getAdminModules(courseId: number): Promise<AdminModuleDto[]> {
  return apiRequest<AdminModuleDto[]>(`/api/courses/${courseId}/modules`);
}

// Загружает один модуль по backend ID.
export async function getAdminModuleById(id: number): Promise<AdminModuleDto> {
  return apiRequest<AdminModuleDto>(`/api/modules/${id}`);
}

// Создает модуль внутри выбранного курса.
export async function createAdminModule(
  courseId: number,
  payload: AdminModuleCreatePayload
): Promise<AdminModuleDto> {
  return apiRequest<AdminModuleDto>(`/api/courses/${courseId}/modules`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// Обновляет выбранный модуль через текущий PUT CourseController.
export async function updateAdminModule(
  id: number,
  payload: AdminModuleCreatePayload
): Promise<AdminModuleDto> {
  return apiRequest<AdminModuleDto>(`/api/modules/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

// Загружает уроки только для выбранного модуля.
export async function getAdminLessons(moduleId: number): Promise<AdminLessonDto[]> {
  return apiRequest<AdminLessonDto[]>(`/api/modules/${moduleId}/lessons`);
}

// Загружает один урок по backend ID.
export async function getAdminLessonById(id: number): Promise<AdminLessonDto> {
  return apiRequest<AdminLessonDto>(`/api/lessons/${id}`);
}

// Создает урок внутри выбранного модуля.
export async function createAdminLesson(
  moduleId: number,
  payload: AdminLessonCreatePayload
): Promise<AdminLessonDto> {
  return apiRequest<AdminLessonDto>(`/api/modules/${moduleId}/lessons`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// Обновляет выбранный урок через текущий PUT CourseController.
export async function updateAdminLesson(
  id: number,
  payload: AdminLessonCreatePayload
): Promise<AdminLessonDto> {
  return apiRequest<AdminLessonDto>(`/api/lessons/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

// Загружает задачи только для выбранного урока.
export async function getAdminTasks(lessonId: number): Promise<AdminTaskDto[]> {
  return apiRequest<AdminTaskDto[]>(`/api/lessons/${lessonId}/tasks`);
}

// Загружает одну задачу по backend ID.
export async function getAdminTaskById(id: number): Promise<AdminTaskDto> {
  return apiRequest<AdminTaskDto>(`/api/tasks/${id}`);
}

// Создает задачу внутри выбранного урока.
export async function createAdminTask(
  lessonId: number,
  payload: AdminTaskCreatePayload
): Promise<AdminTaskDto> {
  return apiRequest<AdminTaskDto>(`/api/lessons/${lessonId}/tasks`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// Обновляет все DTO-поля выбранной задачи через текущий PUT CourseController.
export async function updateAdminTask(
  id: number,
  payload: AdminTaskCreatePayload
): Promise<AdminTaskDto> {
  return apiRequest<AdminTaskDto>(`/api/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

// Создает submission для задачи через текущий backend SubmissionController.
export async function createSubmission(
  taskId: number,
  payload: SubmissionCreatePayload,
  signal?: AbortSignal
): Promise<SubmissionCreatedResponseDto> {
  if (!getAuthToken()) {
    throw new AuthClientError("missing_token", "Чтобы отправить решение, войди в аккаунт.");
  }

  return apiRequest<SubmissionCreatedResponseDto>(`/api/tasks/${taskId}/submissions`, {
    auth: true,
    method: "POST",
    body: JSON.stringify(payload),
    signal
  });
}

// Загружает состояние submission для polling.
export async function getSubmission(
  id: string,
  signal?: AbortSignal
): Promise<SubmissionResponseDto> {
  return apiRequest<SubmissionResponseDto>(`/api/submissions/${id}`, {
    auth: true,
    signal
  });
}
