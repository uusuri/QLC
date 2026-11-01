"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ActivityCalendar } from "@/components/ActivityCalendar";
import { FriendsPanel } from "@/components/FriendsPanel";
import { profileHref } from "@/services/social";
import { Button, Panel, PanelBody } from "@/components/ui";
import { getPublicProfile, getUserActivity, updateProfilePrivacy } from "@/services/api";
import type { UserActivityDto } from "@/types";

export function ProfileSocial({ user }: { user: { id: number; username: string } }) {
  const [activity, setActivity] = useState<UserActivityDto | null>(null);
  const [privateProfile, setPrivateProfile] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [privacyError, setPrivacyError] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const identity = `${user.id}:${user.username}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const generation = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const version = ++generation.current;
    const current = () => !controller.signal.aborted && identityRef.current === identity && generation.current === version;
    setActivity(null);
    setPrivateProfile(null);
    setError("");
    setSaving(false);
    setPrivacyError("");
    void Promise.all([getPublicProfile(user.username, controller.signal), getUserActivity(user.username, controller.signal)]).then(([profile, events]) => {
      if (current()) {
        setPrivateProfile(profile.privateProfile);
        setActivity(events);
      }
    }).catch(err => {
      if (current()) setError(err instanceof Error ? err.message : "Не удалось загрузить активность профиля.");
    });
    return () => {
      generation.current += 1;
      controller.abort();
    };
  }, [attempt, identity, user.username]);

  async function changePrivacy(value: boolean) {
    if (saving || privateProfile === null) return;
    const version = generation.current;
    const current = () => version === generation.current && identityRef.current === identity;
    setSaving(true);
    setPrivacyError("");
    try {
      const updated = await updateProfilePrivacy(value);
      if (current()) {
        setPrivateProfile(updated.privateProfile);
      }
    } catch (err) {
      if (current()) setPrivacyError(err instanceof Error ? err.message : "Не удалось изменить приватность.");
    } finally {
      if (current()) setSaving(false);
    }
  }

  return <div className="kit-social">
    <Panel className="my-4"><PanelBody className="!p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="text-xs text-muted hover:text-acid" href={profileHref(user.username)}>Моя страница ↗</Link>
        <label className="flex min-h-8 cursor-pointer items-center gap-2 text-xs" title="Скрыть фото, статистику и друзей от всех, кроме вас">
          <input checked={privateProfile ?? false} className="h-3.5 w-3.5 accent-acid" disabled={privateProfile === null || saving} onChange={event => void changePrivacy(event.target.checked)} type="checkbox" />
          {saving ? "Сохраняем…" : "Закрытый профиль"}
        </label>
      </div>
      {privacyError && <p className="mt-2 text-xs text-[#FF8074]" role="alert">{privacyError}</p>}
      <div className="mt-2">
        {activity ? <ActivityCalendar activity={activity} own /> : error ? <div role="alert"><p className="text-xs text-[#FF8074]">{error}</p><Button className="mt-2" onClick={() => setAttempt(value => value + 1)} variant="secondary">Повторить</Button></div> : <p className="py-4 text-xs text-muted" role="status">Загрузка…</p>}
      </div>
    </PanelBody></Panel>
    <FriendsPanel key={user.id} userId={user.id} />
  </div>;
}
