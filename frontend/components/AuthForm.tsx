// Форма работает в браузере: localStorage token, router redirect и controlled inputs.
"use client";

// Link нужен для перехода между login/register.
import Link from "next/link";

// useRouter делает redirect после успешного входа/регистрации.
import { useRouter } from "next/navigation";

// React-хуки и тип события формы.
import { useState } from "react";
import type { FormEvent } from "react";

// Auth API идет через service layer.
import { AuthClientError, loginUser, registerUser } from "@/services/api";

// Shared UI-kit.
import { Alert, Button } from "@/components/ui";

// Режим формы.
type AuthFormMode = "login" | "register";

// Состояния формы из карточки.
type AuthFormStatus =
  | "idle"
  | "loading"
  | "success"
  | "validation"
  | "backend"
  | "unauthorized"
  | "duplicate";

// Props формы.
type AuthFormProps = {
  // mode определяет набор полей и endpoint.
  mode: AuthFormMode;
  // redirectTo — куда отправить пользователя после success.
  redirectTo?: string;
};

// Поля формы.
type AuthFields = {
  // email нужен только register.
  email: string;
  // password не сохраняется на фронте.
  password: string;
  // repeatPassword нужен только register.
  repeatPassword: string;
  // username общий для login/register.
  username: string;
};

// Начальные значения полей.
const initialFields: AuthFields = {
  email: "",
  password: "",
  repeatPassword: "",
  username: ""
};

// Username: 3-32 символа, латиница, цифры и underscore.
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,32}$/;

// Простая email-проверка для UX, не заменяет backend validation.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Возвращает ссылку на соседний auth route с сохранением redirectTo.
function getSwitchHref(mode: AuthFormMode, redirectTo?: string) {
  const target = mode === "login" ? "/register" : "/login";
  return redirectTo ? `${target}?redirectTo=${encodeURIComponent(redirectTo)}` : target;
}

// Превращает неизвестную ошибку в понятный статус и текст.
function getErrorState(error: unknown): { message: string; status: AuthFormStatus } {
  if (error instanceof AuthClientError) {
    if (error.code === "unauthorized" || error.code === "missing_token") {
      return { message: error.message, status: "unauthorized" };
    }

    if (error.code === "duplicate_username" || error.code === "duplicate_email") {
      return { message: error.message, status: "duplicate" };
    }

    if (error.code === "validation") {
      return { message: error.message, status: "validation" };
    }
  }

  if (error instanceof Error) {
    return { message: error.message, status: "backend" };
  }

  return { message: "Не удалось выполнить auth-запрос.", status: "backend" };
}

// Валидирует поля до обращения к service layer.
function validateFields(mode: AuthFormMode, fields: AuthFields): string | null {
  if (!USERNAME_PATTERN.test(fields.username.trim())) {
    return "Username: 3-32 символа, латиница, цифры или _.";
  }

  if (mode === "register" && !EMAIL_PATTERN.test(fields.email.trim())) {
    return "Введите корректный email.";
  }

  if (fields.password.length < 8) {
    return "Пароль должен быть минимум 8 символов.";
  }

  if (mode === "register" && fields.password !== fields.repeatPassword) {
    return "Пароли не совпадают.";
  }

  return null;
}

// Общая форма для /login и /register.
export function AuthForm({ mode, redirectTo }: AuthFormProps) {
  const router = useRouter();
  const [fields, setFields] = useState<AuthFields>(initialFields);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<AuthFormStatus>("idle");
  const isRegister = mode === "register";
  const isLoading = status === "loading";
  const submitLabel = isRegister ? "Создать аккаунт" : "Войти";
  const title = isRegister ? "Регистрация" : "Вход";
  const switchText = isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться";
  const finalRedirect = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/profile";

  const updateField = (name: keyof AuthFields, value: string) => {
    setFields((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationMessage = validateFields(mode, fields);

    if (validationMessage) {
      setMessage(validationMessage);
      setStatus("validation");
      return;
    }

    setMessage("");
    setStatus("loading");

    try {
      if (isRegister) {
        await registerUser({
          email: fields.email.trim(),
          password: fields.password,
          username: fields.username.trim()
        });
      } else {
        await loginUser({
          password: fields.password,
          username: fields.username.trim()
        });
      }

      setMessage(isRegister ? "Аккаунт создан. Входим..." : "Вход выполнен.");
      setStatus("success");
      router.push(finalRedirect);
      router.refresh();
    } catch (error) {
      const next = getErrorState(error);
      setMessage(next.message);
      setStatus(next.status);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div>
        <p className="font-mono text-xs font-bold uppercase text-acid">{title}</p>
        <h2 className="mt-4 text-3xl font-black uppercase leading-[1.04] sm:text-5xl">
          {isRegister ? "Создай аккаунт." : "Войди в аккаунт."}
        </h2>
        <p className="mt-5 text-base leading-snug text-white/58">
          {isRegister
            ? "Username, email и пароль. После регистрации токен сохранится локально."
            : "Введи username и пароль. Submission без входа не отправляется."}
        </p>
      </div>

      <label className="grid gap-2">
        <span className="font-mono text-xs font-black uppercase text-white/48">Username</span>
        <input
          autoComplete="username"
          className="min-h-12 border border-line bg-panel/70 px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/22 focus:border-acid focus:bg-ink"
          maxLength={32}
          name="username"
          onChange={(event) => updateField("username", event.target.value)}
          required
          value={fields.username}
        />
      </label>

      {isRegister && (
        <label className="grid gap-2">
          <span className="font-mono text-xs font-black uppercase text-white/48">Email</span>
          <input
            autoComplete="email"
            className="min-h-12 border border-line bg-panel/70 px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/22 focus:border-acid focus:bg-ink"
            name="email"
            onChange={(event) => updateField("email", event.target.value)}
            required
            type="email"
            value={fields.email}
          />
        </label>
      )}

      <label className="grid gap-2">
        <span className="font-mono text-xs font-black uppercase text-white/48">Password</span>
        <input
          autoComplete={isRegister ? "new-password" : "current-password"}
          className="min-h-12 border border-line bg-panel/70 px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/22 focus:border-acid focus:bg-ink"
          minLength={8}
          name="password"
          onChange={(event) => updateField("password", event.target.value)}
          required
          type="password"
          value={fields.password}
        />
      </label>

      {isRegister && (
        <label className="grid gap-2">
          <span className="font-mono text-xs font-black uppercase text-white/48">
            Repeat password
          </span>
          <input
            autoComplete="new-password"
            className="min-h-12 border border-line bg-panel/70 px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/22 focus:border-acid focus:bg-ink"
            minLength={8}
            name="repeatPassword"
            onChange={(event) => updateField("repeatPassword", event.target.value)}
            required
            type="password"
            value={fields.repeatPassword}
          />
        </label>
      )}

      {message && (
        <Alert
          title={
            status === "success"
              ? "success"
              : status === "validation"
                ? "validation error"
                : status === "unauthorized"
                  ? "unauthorized"
                  : status === "duplicate"
                    ? "duplicate"
                    : "backend error"
          }
          tone={status === "success" ? "success" : "danger"}
        >
          {message}
        </Alert>
      )}

      <Button loading={isLoading} type="submit">
        {submitLabel}
      </Button>

      <Link
        className="text-xs font-black uppercase text-white/48 transition hover:text-acid"
        href={getSwitchHref(mode, redirectTo)}
      >
        {switchText}
      </Link>
    </form>
  );
}
