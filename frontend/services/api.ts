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
  CourseAccessCopyDto,
  CourseAccessStatus,
  CourseDto,
  LoginNoteDto,
  PaymentMethodDto,
  StudentProfileDto
} from "@/types";

// Базовый URL backend API. В dev по умолчанию Spring Boot живет на 127.0.0.1:8080.
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8080").replace(
  /\/$/,
  ""
);

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
  options: RequestInit = {}
): Promise<TResponse> {
  // Headers умеет принимать любые допустимые варианты RequestInit.headers.
  const headers = new Headers(options.headers);

  // JSON — общий формат текущих backend DTO.
  headers.set("Content-Type", "application/json");

  // Собираем абсолютный URL, чтобы frontend на 3000 ходил в Spring Boot на 8080.
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  // Ошибки backend превращаем в Error, чтобы UI мог показать error state.
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  // Для текущих GET/POST backend всегда возвращает JSON DTO.
  return (await response.json()) as TResponse;
}

// Публичная витрина пока остается моковой, чтобы не менять пользовательский лендинг в рамках admin-задачи.
// Реальные CourseController endpoints используются ниже в admin-функциях.
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
  // Первый тезис: вход без классических форм.
  {
    id: "no-password",
    title: "без email и пароля"
  },
  // Второй тезис: профиль без персональных данных.
  {
    id: "anonymous-profile",
    title: "анонимный учебный профиль"
  },
  // Третий тезис: место под Telegram API.
  {
    id: "telegram-ready",
    title: "готово под Telegram Widget / WebApps API"
  }
];

// Возвращает каталог курсов для главной и checkout-страницы.
export async function getCourseCatalog(): Promise<CourseDto[]> {
  // TODO: Интегрировать с бэком, когда появится эндпоинт GET /api/courses.
  return courseCatalogMock;
}

// Возвращает курс по slug, а если slug пустой или неизвестный — первый курс каталога.
export async function getCourseBySlug(slug?: string): Promise<CourseDto> {
  // TODO: Интегрировать с бэком, когда появится эндпоинт GET /api/courses/{slug}.
  return courseCatalogMock.find((course) => course.slug === slug) ?? courseCatalogMock[0];
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

// Создает курс через POST /api/courses.
export async function createAdminCourse(
  payload: AdminCourseCreatePayload
): Promise<AdminCourseDto> {
  return apiRequest<AdminCourseDto>("/api/courses", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// Загружает модули только для выбранного курса.
export async function getAdminModules(courseId: number): Promise<AdminModuleDto[]> {
  return apiRequest<AdminModuleDto[]>(`/api/courses/${courseId}/modules`);
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

// Загружает уроки только для выбранного модуля.
export async function getAdminLessons(moduleId: number): Promise<AdminLessonDto[]> {
  return apiRequest<AdminLessonDto[]>(`/api/modules/${moduleId}/lessons`);
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

// Загружает задачи только для выбранного урока.
export async function getAdminTasks(lessonId: number): Promise<AdminTaskDto[]> {
  return apiRequest<AdminTaskDto[]>(`/api/lessons/${lessonId}/tasks`);
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
