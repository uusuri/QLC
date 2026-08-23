"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import { AuthClientError, getLastAccountUsername, loginUser, loginWithTelegram, registerUser } from "@/services/api";
import { Alert, Button } from "@/components/ui";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";
import { getSafeInternalPath, isSafeInternalPath } from "@/services/navigation";
import type { TelegramAuthPayload } from "@/types";

type AuthFormMode = "login" | "register";

type AuthFormStatus =
  | "idle"
  | "loading"
  | "success"
  | "validation"
  | "backend"
  | "unauthorized"
  | "duplicate";

type AuthFormProps = {
  mode: AuthFormMode;
  redirectTo?: string;
};

type AuthFields = {
  email: string;
  password: string;
  repeatPassword: string;
  username: string;
};

const initialFields: AuthFields = {
  email: "",
  password: "",
  repeatPassword: "",
  username: ""
};

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSwitchHref(mode: AuthFormMode, redirectTo?: string) {
  const target = mode === "login" ? "/register" : "/login";
  return isSafeInternalPath(redirectTo) ? `${target}?redirectTo=${encodeURIComponent(redirectTo)}` : target;
}

// Обработка ошибок auth-формы.
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

  return { message: "Не удалось выполнить запрос. Попробуйте ещё раз.", status: "backend" };
}

function validateFields(mode: AuthFormMode, fields: AuthFields): { field: keyof AuthFields; message: string } | null {
  if (!USERNAME_PATTERN.test(fields.username.trim())) {
    return { field: "username", message: "Логин: 3–32 символа, латиница, цифры или _." };
  }

  if (mode === "register" && !EMAIL_PATTERN.test(fields.email.trim())) {
    return { field: "email", message: "Введите корректный email." };
  }

  if (fields.password.length < 8) {
    return { field: "password", message: "Пароль должен быть минимум 8 символов." };
  }

  if (mode === "register" && fields.password !== fields.repeatPassword) {
    return { field: "repeatPassword", message: "Пароли не совпадают." };
  }

  return null;
}

export function AuthForm({ mode, redirectTo }: AuthFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState<AuthFields>(initialFields);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AuthFields, string>>>({});
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<AuthFormStatus>("idle");
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [lastAccount, setLastAccount] = useState<string | null>(null);
  const isRegister = mode === "register";
  const isLoading = status === "loading";
  const submitLabel = isRegister ? "Создать аккаунт" : "Войти";
  const title = isRegister ? "Регистрация" : "Вход";
  const switchText = isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться";
  const finalRedirect = getSafeInternalPath(redirectTo, "/profile");

  useEffect(() => {
    if (mode !== "login") {
      return;
    }

    const username = getLastAccountUsername();
    setLastAccount(username);
    if (username) {
      setFields((current) => ({ ...current, username }));
    }
  }, [mode]);

  const alertTitle =
    status === "success"
      ? "Готово"
      : status === "validation"
        ? "Проверьте данные"
        : status === "unauthorized"
          ? "Неверные данные"
          : status === "duplicate"
            ? "Аккаунт уже существует"
            : "Ошибка";

  const updateField = (name: keyof AuthFields, value: string) => {
    setFields((current) => ({
      ...current,
      [name]: value
    }));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    if (status === "validation") {
      setMessage("");
      setStatus("idle");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateFields(mode, fields);

    if (validationError) {
      setFieldErrors({ [validationError.field]: validationError.message });
      setMessage("Исправьте отмеченное поле.");
      setStatus("validation");
      window.requestAnimationFrame(() => {
        formRef.current
          ?.querySelector<HTMLInputElement>(`[name="${validationError.field}"]`)
          ?.focus();
      });
      return;
    }

    setFieldErrors({});
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

  const handleTelegramAuth = async (payload: TelegramAuthPayload) => {
    setMessage("");
    setStatus("loading");
    await loginWithTelegram(payload);
    setMessage("Вход через Telegram выполнен.");
    setStatus("success");
    router.push(finalRedirect);
    router.refresh();
  };

  return (
    <form aria-busy={isLoading} className="grid gap-5" noValidate onSubmit={handleSubmit} ref={formRef}>
      <div>
        <p className="font-mono text-xs font-black uppercase tracking-[0.16em] text-acid">{title}</p>
        <h1 className="mt-4 text-3xl font-bold leading-[1.04] tracking-[-0.04em] sm:text-5xl">
          {isRegister ? "Создайте аккаунт." : "Войдите в аккаунт."}
        </h1>
        <p className="mt-5 text-base leading-relaxed text-white/64">
          {isRegister
            ? "Укажите логин, email и пароль. После регистрации можно покупать курсы и отслеживать прогресс."
            : "Введите логин и пароль, чтобы продолжить обучение."}
        </p>
      </div>

      <InputField
        autoComplete="username"
        error={fieldErrors.username}
        label="Логин"
        maxLength={32}
        name="username"
        onChange={(value) => updateField("username", value)}
        placeholder="runner_01"
        value={fields.username}
      />

      {!isRegister && lastAccount && (
        <p className="-mt-2 font-mono text-xs font-bold text-white/52">
          Последний аккаунт · <span className="text-acid">@{lastAccount}</span>
        </p>
      )}

      {isRegister && (
        <InputField
          autoComplete="email"
          error={fieldErrors.email}
          label="Email"
          name="email"
          onChange={(value) => updateField("email", value)}
          placeholder="you@example.com"
          type="email"
          value={fields.email}
        />
      )}

      <InputField
        autoComplete={isRegister ? "new-password" : "current-password"}
        error={fieldErrors.password}
        label="Пароль"
        minLength={8}
        name="password"
        onChange={(value) => updateField("password", value)}
        onToggleVisibility={() => setShowPassword((current) => !current)}
        placeholder="8+ символов"
        reveal={showPassword}
        type="password"
        value={fields.password}
      />

      {isRegister && (
        <InputField
          autoComplete="new-password"
          error={fieldErrors.repeatPassword}
          label="Повтор пароля"
          minLength={8}
          name="repeatPassword"
          onChange={(value) => updateField("repeatPassword", value)}
          onToggleVisibility={() => setShowRepeat((current) => !current)}
          placeholder="повторите пароль"
          reveal={showRepeat}
          type="password"
          value={fields.repeatPassword}
        />
      )}

      {message && (
        <Alert title={alertTitle} tone={status === "success" ? "success" : "danger"}>
          {message}
        </Alert>
      )}

      <Button loading={isLoading} type="submit">
        {submitLabel}
      </Button>

      <div className="grid gap-3">
        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/34 before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
          или
        </div>
        <TelegramLoginButton disabled={isLoading} onAuth={handleTelegramAuth} onError={(error) => {
          setMessage(error);
          setStatus("backend");
        }} />
      </div>

      <Link
        className="inline-flex min-h-11 items-center text-sm font-semibold text-white/62 transition hover:text-acid"
        href={getSwitchHref(mode, redirectTo)}
      >
        {switchText}
      </Link>
    </form>
  );
}

function InputField({
  autoComplete,
  error,
  label,
  maxLength,
  minLength,
  name,
  onChange,
  onToggleVisibility,
  placeholder,
  reveal,
  type = "text",
  value
}: {
  autoComplete?: string;
  error?: string;
  label: string;
  maxLength?: number;
  minLength?: number;
  name: string;
  onChange: (value: string) => void;
  onToggleVisibility?: () => void;
  placeholder?: string;
  reveal?: boolean;
  type?: string;
  value: string;
}) {
  const inputType = type === "password" && reveal ? "text" : type;

  return (
    <label className="grid gap-2">
      <span className="font-mono text-xs font-bold text-white/62">{label}</span>
      <span className="relative">
        <input
          aria-describedby={error ? `${name}-error` : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete={autoComplete}
          className="min-h-12 w-full rounded-2xl border border-line bg-white/[0.035] px-4 pr-20 text-sm font-semibold text-white outline-none transition placeholder:text-white/52 hover:border-white/20 focus:border-acid focus:bg-ink aria-[invalid=true]:border-red-400"
          maxLength={maxLength}
          minLength={minLength}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required
          type={inputType}
          value={value}
        />
        {type === "password" && onToggleVisibility && (
          <button
            aria-label={reveal ? "Скрыть пароль" : "Показать пароль"}
            className="absolute right-1.5 top-1/2 inline-flex min-h-11 min-w-16 -translate-y-1/2 items-center justify-center rounded-xl px-2 font-mono text-[10px] font-black uppercase text-white/52 transition hover:bg-white/[0.06] hover:text-acid"
            onClick={onToggleVisibility}
            type="button"
          >
            {reveal ? "скрыть" : "показать"}
          </button>
        )}
      </span>
      {error ? <span className="text-xs font-semibold text-red-200" id={`${name}-error`}>{error}</span> : null}
    </label>
  );
}
