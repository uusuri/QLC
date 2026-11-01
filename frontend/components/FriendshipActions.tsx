"use client";

import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { Button, ButtonLink } from "@/components/ui";
import { acceptFriendRequest, dismissFriendRequest, removeFriend, sendFriendRequest } from "@/services/api";
import { profileHref } from "@/services/social";
import type { FriendUserDto, UserProfileDto } from "@/types";

export function FriendshipActions({ target, relationship, onChange }: {
  target: FriendUserDto;
  relationship: UserProfileDto["relationship"];
  onChange: () => void | Promise<void>;
}) {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const identity = `${user?.id ?? "anonymous"}:${target.id}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const active = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    active.current = true;
    generation.current += 1;
    setBusy(false);
    setError("");
    return () => { active.current = false; generation.current += 1; };
  }, [identity]);

  async function perform(action: (id: number) => Promise<void>) {
    if (!user || loading || busy) return;
    const requestIdentity = identity;
    const version = generation.current;
    const current = () => active.current && identityRef.current === requestIdentity && generation.current === version;
    setBusy(true);
    setError("");
    try {
      await action(target.id);
      if (current()) await onChange();
    } catch (err) {
      if (current()) setError(err instanceof Error ? err.message : "Не удалось изменить статус дружбы.");
    } finally {
      if (current()) setBusy(false);
    }
  }

  if (relationship === "SELF") return <ButtonLink href="/profile" variant="secondary">Мой кабинет</ButtonLink>;
  if (!user) return <ButtonLink disabled={loading} href={`/login?redirectTo=${encodeURIComponent(profileHref(target.username))}`} variant="secondary">Войти</ButtonLink>;

  return <div className="grid gap-2">
    <div className="flex flex-wrap items-center gap-2">
      {relationship === "NONE" && <Button aria-label={`Добавить ${target.username} в друзья`} disabled={busy || loading} onClick={() => void perform(sendFriendRequest)} variant="secondary">{busy ? "…" : "Добавить"}</Button>}
      {relationship === "INCOMING" && <>
        <Button disabled={busy || loading} onClick={() => void perform(acceptFriendRequest)}>Принять</Button>
        <Button disabled={busy || loading} onClick={() => void perform(dismissFriendRequest)} variant="secondary">Отклонить</Button>
      </>}
      {relationship === "OUTGOING" && <>
        <Button disabled={busy || loading} onClick={() => void perform(dismissFriendRequest)} variant="secondary">Отменить заявку</Button>
      </>}
      {relationship === "FRIENDS" && <>
        <Button aria-label={`Удалить ${target.username} из друзей`} disabled={busy || loading} onClick={() => void perform(removeFriend)} variant="secondary">Удалить</Button>
      </>}
    </div>
    {error && <p className="max-w-lg text-sm text-[#FF8074]" role="alert">{error}</p>}
  </div>;
}
