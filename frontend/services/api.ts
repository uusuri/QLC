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
  CartResponseDto,
  CourseAccessResponseDto,
  CourseLearningViewDto,
  MyCourseProgressDto,
  CourseAccessCopyDto,
  CourseAccessStatus,
  CourseDto,
  LessonLearnResponseDto,
  LessonLearningViewDto,
  LearnerTaskDto,
  LessonTaskOutlineDto,
  LoginUserPayload,
  LoginNoteDto,
  PaymentMethodDto,
  RegisterUserPayload,
  SubmissionCreatePayload,
  SubmissionCreatedResponseDto,
  SubmissionResponseDto,
  TelegramAuthPayload
} from "@/types";

const API_BASE_URL = (
  typeof window === "undefined"
    ? process.env.BACKEND_INTERNAL_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      "http://127.0.0.1:8080"
    : process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
).replace(/\/$/, "");

const AUTH_TOKEN_STORAGE_KEY = "qlc:auth-token";
const AUTH_USER_STORAGE_KEY = "qlc:auth-user";
const LAST_ACCOUNT_STORAGE_KEY = "qlc:last-account";
const AUTH_CHANGE_EVENT = "qlc-auth-change";

type ApiRequestOptions = RequestInit & {
  auth?: boolean;
};

export class AuthClientError extends Error {
  code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "AuthClientError";
  }
}

export class ApiClientError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiClientError";
  }
}

// Дефолтная картинка нужна, потому что backend CourseDTO пока не содержит imageUrl.
const DEFAULT_COURSE_IMAGE_URL =
  "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringField(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  return typeof value === "string" ? value : undefined;
}

async function readErrorMessage(response: Response): Promise<string> {
  // Backend может вернуть JSON ErrorDTO, стандартную Spring-ошибку или plain text.
  const text = await response.text();

  if (!text) {
    return `Backend error ${response.status} ${response.statusText}`;
  }

  try {
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
  }

  return text;
}

async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<TResponse> {
  const { auth = false, ...requestOptions } = options;
  const method = (requestOptions.method ?? "GET").toUpperCase();
  const headers = new Headers(requestOptions.headers);

  if (requestOptions.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getAuthToken();

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    ...(auth || method !== "GET" ? { cache: "no-store" as const } : {}),
    headers
  });

  if (!response.ok) {
    // Истекший JWT нельзя оставлять в localStorage: иначе защищённые формы
    // продолжают отправлять его и показывают ошибки до ручного перелогина.
    if (auth && response.status === 401) {
      clearAuthToken();
      throw new AuthClientError("unauthorized", "Сессия истекла. Войдите снова.");
    }

    throw new ApiClientError(response.status, await readErrorMessage(response));
  }

  return (await response.json()) as TResponse;
}

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
export function parseCourseIdFromSlug(slug: string): number | null {
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
    window.localStorage.setItem(LAST_ACCOUNT_STORAGE_KEY, response.user.username);
  }

  emitAuthChange();
}

// Маппит backend CourseDTO в frontend CourseDto, который ожидает главная витрина.
export function formatRussianCountWord(count: number, forms: [string, string, string]) {
  const remainder100 = Math.abs(count) % 100;
  const remainder10 = Math.abs(count) % 10;

  if (remainder100 >= 11 && remainder100 <= 14) {
    return forms[2];
  }

  if (remainder10 === 1) {
    return forms[0];
  }

  if (remainder10 >= 2 && remainder10 <= 4) {
    return forms[1];
  }

  return forms[2];
}

export function formatLessonsLabel(lessonsCount: number) {
  return `${lessonsCount} ${formatRussianCountWord(lessonsCount, ["урок", "урока", "уроков"])}`;
}

export function formatCoursesLabel(coursesCount: number) {
  return `${coursesCount} ${formatRussianCountWord(coursesCount, ["курс", "курса", "курсов"])}`;
}

function mapAdminCourseToCatalogCourse(course: AdminCourseDto, lessonsCount = 0): CourseDto {
  const price = formatRubPrice(course.price);
  const oldPrice = formatRubPrice(price.amount > 0 ? price.amount * 2 : null);

  return {
    slug: `course-${course.id}`,
    title: course.name,
    description: course.description || "Описание курса скоро появится.",
    imageUrl: DEFAULT_COURSE_IMAGE_URL,
    badge: "course",
    lessonsCount,
    lessonsLabel: formatLessonsLabel(lessonsCount),
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
    language: task.language,
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

// Тексты состояний доступа в checkout.
export const COURSE_ACCESS_COPY: Record<CourseAccessStatus, CourseAccessCopyDto> = {
  open: {
    label: "Открыт",
    title: "Курс открыт",
    description: "Доступ уже активирован. Можно сразу продолжить обучение."
  },
  locked: {
    label: "Требуется оплата",
    title: "Требуется оплата",
    description: "После успешной оплаты курс появится в профиле, а материалы станут доступны."
  },
  pending: {
    label: "Ожидает оплаты",
    title: "Платеж готовится",
    description: "Платеж обрабатывается. Как только он подтвердится, доступ откроется автоматически."
  }
};

const paymentMethodsMock: PaymentMethodDto[] = [
  {
    id: "stars",
    title: "Telegram Stars",
    description: "Оплата цифрового курса внутри Telegram.",
    tag: "primary",
    enabled: true
  },
  {
    id: "crypto",
    title: "Криптовалюта",
    description: "Скоро появится.",
    tag: "soon",
    enabled: false
  }
];

const loginNotesMock: LoginNoteDto[] = [
  {
    id: "username-password",
    title: "Логин и пароль"
  },
  {
    id: "local-token",
    title: "Сессия сохраняется в браузере"
  },
  {
    id: "authorized-submission",
    title: "Решения отправляются только после входа"
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

export function getLastAccountUsername(): string | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  const username = window.localStorage.getItem(LAST_ACCOUNT_STORAGE_KEY)?.trim();
  return username || null;
}

// Возвращает сохраненное в localStorage краткое summary пользователя.
// Используется для синхронной инициализации UI перед фоновой проверкой токена.
export function getStoredUser(): AuthUserDto | null {
  if (!canUseLocalStorage() || !getAuthToken()) {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUserDto;
  } catch {
    return null;
  }
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

export async function loginWithTelegram(payload: TelegramAuthPayload): Promise<AuthResponseDto> {
  const response = await apiRequest<AuthResponseDto>("/api/auth/telegram", {
    method: "POST",
    body: JSON.stringify(payload)
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
  } catch (error) {
    // При 401 apiRequest уже очистил сессию и разослал событие AuthProvider.
    if (error instanceof AuthClientError) {
      return null;
    }

    // Временная ошибка сети не должна разлогинивать пользователя.
    return getStoredUser();
  }
}

// Выполняет logout на фронте.
export function logoutUser() {
  clearAuthToken();
}

// Возвращает каталог курсов для главной и checkout-страницы.
export async function getCourseCatalog(): Promise<CourseDto[]> {
  const courses = await getAdminCourses();

  return Promise.all(
    courses.map(async (course) => {
      const modules = await getAdminModules(course.id);
      const lessonsByModule = await Promise.all(modules.map((module) => getAdminLessons(module.id)));
      const lessonsCount = lessonsByModule.flat().filter((lesson) => lesson.published).length;

      return mapAdminCourseToCatalogCourse(course, lessonsCount);
    })
  );
}

// Собирает страницу курса: сам курс, модули, уроки и первый доступный урок.
export async function getCourseLearningView(slug: string): Promise<CourseLearningViewDto | null> {
  const courseId = parseCourseIdFromSlug(slug);

  if (courseId === null) {
    return null;
  }

  let course: AdminCourseDto;
  let modules: AdminModuleDto[];

  try {
    [course, modules] = await Promise.all([
      getAdminCourseById(courseId),
      getAdminModules(courseId)
    ]);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return null;
    }

    throw error;
  }

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
    catalogCourse: mapAdminCourseToCatalogCourse(
      course,
      modulesWithLessons.flatMap((item) => item.lessons).filter((lesson) => lesson.published).length
    ),
    modules: modulesWithLessons,
    firstLesson
  };
}

// Возвращает урок с задачами только для купившего курс пользователя.
export async function getLessonForUser(id: number): Promise<LessonLearnResponseDto> {
  return apiRequest<LessonLearnResponseDto>(`/api/lessons/${id}/learn`, { auth: true });
}

// Проверяет, купил ли текущий пользователь выбранный курс.
export async function getCourseAccess(courseId: number): Promise<boolean> {
  const response = await apiRequest<CourseAccessResponseDto>(`/api/courses/${courseId}/access`, {
    auth: true
  });
  return response.access;
}

// Собирает страницу урока: урок, родительский модуль/курс и задачи урока.
export async function getLessonLearningView(id: number): Promise<LessonLearningViewDto | null> {
  const { lesson, tasks } = await getLessonForUser(id);
  const module = await getAdminModuleById(lesson.moduleId);
  const course = await getAdminCourseById(module.courseId);
  const mappedTasks = tasks.map(mapAdminTaskToLearnerTask);

  return {
    course,
    lesson,
    module,
    primaryTask: mappedTasks[0] ?? null,
    tasks: mappedTasks
  };
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
    auth: true,
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
    auth: true,
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
    auth: true,
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
    auth: true,
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

// Загружает уроки только для выбранного модуля.
export async function getAdminLessons(moduleId: number): Promise<AdminLessonDto[]> {
  return apiRequest<AdminLessonDto[]>(`/api/modules/${moduleId}/lessons`);
}

// Загружает один урок для админки (полные данные независимо от доступа).
export async function getAdminLessonById(id: number): Promise<AdminLessonDto> {
  return apiRequest<AdminLessonDto>(`/api/admin/lessons/${id}`, { auth: true });
}

// Создает урок внутри выбранного модуля.
export async function createAdminLesson(
  moduleId: number,
  payload: AdminLessonCreatePayload
): Promise<AdminLessonDto> {
  return apiRequest<AdminLessonDto>(`/api/modules/${moduleId}/lessons`, {
    auth: true,
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
    auth: true,
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

// Загружает задачи только для выбранного урока.
export async function getAdminTasks(lessonId: number): Promise<AdminTaskDto[]> {
  return apiRequest<AdminTaskDto[]>(`/api/lessons/${lessonId}/tasks`);
}

export async function getLessonTaskOutlines(lessonId: number): Promise<LessonTaskOutlineDto[]> {
  return apiRequest<LessonTaskOutlineDto[]>(`/api/lessons/${lessonId}/task-outline`);
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
    auth: true,
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
    auth: true,
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
    throw new AuthClientError("missing_token", "Чтобы отправить решение, войдите в аккаунт.");
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

// Добавляет курс в корзину текущего пользователя.
export async function addCourseToCart(courseId: number): Promise<CartResponseDto> {
  return apiRequest<CartResponseDto>("/api/cart/items", {
    auth: true,
    method: "POST",
    body: JSON.stringify({ courseId })
  });
}

// Возвращает содержимое корзины текущего пользователя.
export async function getCart(): Promise<CartResponseDto> {
  return apiRequest<CartResponseDto>("/api/cart", { auth: true });
}

// Выполняет mock-оплату содержимого корзины и открывает доступ к курсам.
export async function purchaseCart(): Promise<AdminCourseDto[]> {
  return apiRequest<AdminCourseDto[]>("/api/purchase/checkout", {
    auth: true,
    method: "POST"
  });
}

// Возвращает все купленные курсы, модули, уроки и реальный прогресс текущего ученика.
export async function getMyLearningCourses(): Promise<MyCourseProgressDto[]> {
  return apiRequest<MyCourseProgressDto[]>("/api/users/me/learning-courses", { auth: true });
}
