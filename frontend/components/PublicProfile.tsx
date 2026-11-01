"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ActivityCalendar } from "@/components/ActivityCalendar";
import { useAuth } from "@/components/AuthProvider";
import { FriendshipActions } from "@/components/FriendshipActions";
import { PageState } from "@/components/PageState";
import { SocialUser, UserAvatar } from "@/components/SocialUser";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button, Panel, PanelBody } from "@/components/ui";
import { getPublicProfile, getUserActivity, getUserFriends } from "@/services/api";
import { experiencePercent } from "@/services/experience";
import type { FriendUserDto, UserActivityDto, UserProfileDto } from "@/types";

const number = new Intl.NumberFormat("ru-RU");

function PublicProfileContent({ username }: { username: string }) {
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [activity, setActivity] = useState<UserActivityDto | null>(null);
  const [friends, setFriends] = useState<FriendUserDto[] | null>(null);
  const [error, setError] = useState("");
  const [detailsError, setDetailsError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const active = useRef(false);
  const loadVersion = useRef(0);

  const reload = useCallback(async (signal?: AbortSignal) => {
    const version = ++loadVersion.current;
    const current = () => active.current && version === loadVersion.current && !signal?.aborted;
    const person = await getPublicProfile(username, signal);
    if (!current()) return;
    setProfile(person);
    setError("");
    setDetailsError("");
    setActivity(null);
    setFriends(null);
    if (!person.accessible) return;
    try {
      const [events, connections] = await Promise.all([getUserActivity(username, signal), getUserFriends(username, signal)]);
      if (current()) {
        setActivity(events);
        setFriends(connections);
      }
    } catch (err) {
      if (current()) setDetailsError(err instanceof Error ? err.message : "Не удалось загрузить активность и друзей.");
    }
  }, [username]);

  useEffect(() => {
    const controller = new AbortController();
    active.current = true;
    setProfile(null);
    setError("");
    setDetailsError("");
    setActivity(null);
    setFriends(null);
    void reload(controller.signal).catch(err => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Не удалось открыть профиль.");
    });
    return () => {
      active.current = false;
      loadVersion.current += 1;
      controller.abort();
    };
  }, [attempt, reload]);

  if (error) return <PageState eyebrow="Профиль" title="Профиль недоступен" text={error} />;
  if (!profile) return <PageState eyebrow="Профиль" title="Загрузка…" text="Получаем данные пользователя." />;

  const experience = profile.experience;

  return <div className="kit-shell"><SiteHeader /><main className="kit-page kit-social" id="main-content" tabIndex={-1}>
    <header className="flex flex-wrap items-center gap-4 border-b border-line py-5">
      <UserAvatar authenticated={profile.relationship === "SELF" && profile.privateProfile} large user={profile} />
      <div className="min-w-0 flex-1">
        <h1 className="break-words text-2xl sm:text-3xl">@{profile.username}</h1>
        {profile.privateProfile && <p className="mt-1 text-xs text-muted">Закрытый профиль</p>}
      </div>
      <FriendshipActions onChange={() => reload()} relationship={profile.relationship} target={profile} />
    </header>
    {!profile.accessible ? null
      : <>
        <dl className="kit-stats"><div><dt>Решено задач</dt><dd>{number.format(profile.solvedTasks ?? 0)}</dd></div><div><dt>Отправок решений</dt><dd>{number.format(profile.submissionCount ?? 0)}</dd></div><div><dt>Друзья</dt><dd>{number.format(profile.friendCount ?? 0)}</dd></div></dl>
        {experience && <Panel className="my-4"><PanelBody className="!p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 className="text-base">Уровень {number.format(experience.level)}</h2><p className="font-mono text-xs text-acid">{number.format(experience.totalXp)} XP</p></div>
          <div aria-label="Опыт до следующего уровня" aria-valuemax={experience.xpRequiredForLevel} aria-valuemin={0} aria-valuenow={experience.currentLevelXp} className="mt-3 h-2 overflow-hidden rounded-sm bg-white/10" role="progressbar"><span className="block h-full bg-acid" style={{ width: `${experiencePercent(experience)}%` }} /></div>
        </PanelBody></Panel>}
        {detailsError ? <Panel className="my-8"><PanelBody><p className="text-sm text-[#FF8074]" role="alert">{detailsError}</p><Button className="mt-4" onClick={() => setAttempt(value => value + 1)} variant="secondary">Повторить загрузку</Button></PanelBody></Panel>
          : <>
            <Panel className="my-4"><PanelBody className="!p-4">{activity ? <ActivityCalendar activity={activity} own={profile.relationship === "SELF"} /> : <p className="text-xs text-muted" role="status">Загрузка…</p>}</PanelBody></Panel>
            <Panel className="my-4"><PanelBody className="!p-4"><h2 className="mb-2 text-base">Друзья{friends ? ` · ${friends.length}` : ""}</h2>{friends ? friends.length ? friends.map(person => <SocialUser key={person.id} user={person} />) : <p className="text-xs text-muted">Пока пусто.</p> : <p className="text-xs text-muted" role="status">Загрузка…</p>}</PanelBody></Panel>
          </>}
      </>}
    <Link className="qlc-text-link my-8 inline-block text-sm" href="/courses">К курсам →</Link>
  </main><SiteFooter /></div>;
}

export function PublicProfile({ username }: { username: string }) {
  const { user, loading } = useAuth();
  if (loading) return <PageState eyebrow="Профиль" title="Загрузка…" text="Проверяем сессию." />;
  return <PublicProfileContent key={`${username}:${user?.id ?? "anonymous"}`} username={username} />;
}
