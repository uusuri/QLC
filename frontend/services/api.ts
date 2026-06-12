// Общие типы фронтенда лежат отдельно, чтобы страницы не дублировали контракты данных.
import type {
  CourseAccessCopyDto,
  CourseAccessStatus,
  CourseDto,
  LoginNoteDto,
  PaymentMethodDto,
  StudentProfileDto
} from "@/types";

// TODO: Интегрировать с бэком, когда появится эндпоинт каталога курсов.
// Пока backend не содержит CourseController/DTO, поэтому данные остаются чистым мокем без fetch.
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
