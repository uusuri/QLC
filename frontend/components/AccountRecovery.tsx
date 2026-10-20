"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Alert, Button } from "@/components/ui";
import { confirmEmailVerification, confirmPasswordReset, requestPasswordReset } from "@/services/api";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить запрос.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="grid gap-6">
    <div><p className="qlc-eyebrow text-acid">Восстановление доступа</p><h1 className="kit-auth-title">Забыли пароль?</h1>
      <p className="mt-4 text-sm leading-relaxed text-white/60">Укажите почту, привязанную к аккаунту. Мы пришлём ссылку для смены пароля.</p></div>
    {sent ? <Alert title="Проверьте почту" tone="success">Если этот адрес привязан к аккаунту, письмо отправлено. Ссылка действует 30 минут.</Alert> :
      <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
        <label className="grid gap-2"><span className="text-xs font-semibold text-white/75">Email</span>
          <input autoComplete="email" className="kit-input" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email} /></label>
        {error && <Alert title="Не удалось отправить запрос" tone="danger">{error}</Alert>}
        <Button className="min-h-12 justify-between" loading={busy} type="submit">Отправить ссылку <span aria-hidden="true">↗</span></Button>
      </form>}
    <Link className="qlc-text-link w-fit text-white/60" href="/login">Вернуться ко входу →</Link>
  </div>;
}

export function ResetPasswordForm({ token }: { token?: string }) {
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (password.length < 8 || password.length > 72) {
      setError("Пароль должен содержать от 8 до 72 символов.");
      return;
    }
    if (password !== repeat) {
      setError("Пароли не совпадают.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сменить пароль.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="grid gap-6">
    <div><p className="qlc-eyebrow text-acid">Восстановление доступа</p><h1 className="kit-auth-title">Новый пароль</h1></div>
    {!token ? <Alert title="Ссылка неполная" tone="danger">Запросите новое письмо для сброса пароля.</Alert> :
      done ? <Alert title="Пароль изменён" tone="success">Старые сеансы завершены. Войдите с новым паролем.</Alert> :
        <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
          <label className="grid gap-2"><span className="text-xs font-semibold text-white/75">Новый пароль</span>
            <input autoComplete="new-password" className="kit-input" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
          <label className="grid gap-2"><span className="text-xs font-semibold text-white/75">Повторите пароль</span>
            <input autoComplete="new-password" className="kit-input" minLength={8} onChange={(event) => setRepeat(event.target.value)} required type="password" value={repeat} /></label>
          {error && <Alert title="Не удалось сменить пароль" tone="danger">{error}</Alert>}
          <Button className="min-h-12 justify-between" loading={busy} type="submit">Сохранить пароль <span aria-hidden="true">↗</span></Button>
        </form>}
    <Link className="qlc-text-link w-fit text-white/60" href={done ? "/login" : "/forgot-password"}>{done ? "Войти →" : "Запросить новую ссылку →"}</Link>
  </div>;
}

export function VerifyEmailStatus({ token }: { token?: string }) {
  const started = useRef(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    void confirmEmailVerification(token).then(() => setStatus("success")).catch(() => setStatus("error"));
  }, [token]);

  return <div className="grid gap-6">
    <div><p className="qlc-eyebrow text-acid">Подтверждение почты</p><h1 className="kit-auth-title">{status === "loading" ? "Проверяем ссылку…" : status === "success" ? "Почта подтверждена" : "Ссылка не работает"}</h1></div>
    {status === "success" ? <Alert title="Готово" tone="success">Теперь вы сможете восстановить пароль через этот адрес.</Alert> :
      status === "error" ? <Alert title="Ссылка недействительна" tone="danger">Она могла устареть или уже использоваться. Если вы вошли в аккаунт, запросите новое письмо в профиле.</Alert> : null}
    {status !== "loading" && <Link className="qlc-text-link w-fit text-white/60" href={status === "success" ? "/profile" : "/login"}>{status === "success" ? "В профиль →" : "Ко входу →"}</Link>}
  </div>;
}
