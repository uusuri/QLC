"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { FriendshipActions } from "@/components/FriendshipActions";
import { SocialUser } from "@/components/SocialUser";
import { Button, Panel, PanelBody } from "@/components/ui";
import { getFriendRequests, getMyFriends, searchUsers } from "@/services/api";
import { friendshipForUser } from "@/services/social";
import type { FriendUserDto, UserProfileDto } from "@/types";

type FriendsData = {
  friends: FriendUserDto[];
  incoming: FriendUserDto[];
  outgoing: FriendUserDto[];
};

export function FriendsPanel({ userId }: { userId: number }) {
  const [data, setData] = useState<FriendsData | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendUserDto[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const active = useRef(false);
  const identity = useRef(userId);
  identity.current = userId;
  const loadVersion = useRef(0);
  const searchVersion = useRef(0);
  const searchController = useRef<AbortController | null>(null);

  const reload = useCallback(async (signal?: AbortSignal) => {
    const version = ++loadVersion.current;
    const [friends, requests] = await Promise.all([getMyFriends(signal), getFriendRequests(signal)]);
    if (active.current && identity.current === userId && version === loadVersion.current && !signal?.aborted) {
      setData({ friends, incoming: requests.incoming, outgoing: requests.outgoing });
      setError("");
    }
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    active.current = true;
    setData(null);
    setError("");
    setQuery("");
    setResults(null);
    setSearchError("");
    setSearching(false);
    void reload(controller.signal).catch(err => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Не удалось загрузить друзей.");
    });
    return () => {
      active.current = false;
      loadVersion.current += 1;
      searchVersion.current += 1;
      controller.abort();
      searchController.current?.abort();
    };
  }, [reload]);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (text.length < 2) {
      setSearchError("Введите хотя бы два символа логина.");
      return;
    }
    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    const version = ++searchVersion.current;
    const current = () => active.current && identity.current === userId && version === searchVersion.current && !controller.signal.aborted;
    setSearching(true);
    setSearchError("");
    setResults(null);
    try {
      const users = await searchUsers(text, controller.signal);
      if (current()) setResults(users.filter(item => item.id !== userId));
    } catch (err) {
      if (current()) setSearchError(err instanceof Error ? err.message : "Поиск недоступен. Попробуйте ещё раз.");
    } finally {
      if (current()) setSearching(false);
    }
  }

  const users = (items: FriendUserDto[], status?: UserProfileDto["relationship"]) => items.map(person => <SocialUser key={person.id} user={person}>
    <FriendshipActions onChange={() => reload()} relationship={status ?? friendshipForUser(person.id, userId, data)} target={person} />
  </SocialUser>);

  return <Panel className="my-4">
    <PanelBody className="!p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base">Друзья{data ? ` · ${data.friends.length}` : ""}</h2>
      </div>
      {error ? <div role="alert"><p className="text-sm text-[#FF8074]">{error}</p><button className="qlc-text-link mt-3" onClick={() => void reload().catch(err => {
        if (active.current && identity.current === userId) setError(err instanceof Error ? err.message : "Не удалось загрузить друзей.");
      })} type="button">Повторить загрузку →</button></div>
        : !data ? <p className="text-xs text-muted" role="status">Загрузка…</p>
        : <div className="grid gap-3">
          {data.incoming.length > 0 && <section aria-label="Входящие заявки"><h3 className="mb-1 text-xs text-muted">Заявки · {data.incoming.length}</h3>{users(data.incoming, "INCOMING")}</section>}
          <section aria-label="Список друзей">
            {data.friends.length ? users(data.friends, "FRIENDS") : <p className="text-xs text-muted">Пока пусто.</p>}
          </section>
          {data.outgoing.length > 0 && <details><summary className="py-2 text-xs text-muted">Отправленные · {data.outgoing.length}</summary>{users(data.outgoing, "OUTGOING")}</details>}
        </div>}
      <section aria-label="Поиск пользователей" className="mt-3 border-t border-line pt-3">
        <form className="flex gap-2" onSubmit={event => void search(event)}>
          <label className="sr-only" htmlFor="friend-search">Логин пользователя</label>
          <input autoComplete="off" className="min-h-9 min-w-0 flex-1 rounded-sm border border-line bg-black/20 px-3 text-xs text-paper outline-none focus:border-acid" id="friend-search" maxLength={32} onChange={event => {
            searchController.current?.abort();
            searchVersion.current += 1;
            setQuery(event.target.value);
            setResults(null);
            setSearching(false);
            setSearchError("");
          }} placeholder="Найти по логину" type="search" value={query} />
          <Button disabled={!data || searching || query.trim().length < 2} type="submit" variant="secondary">{searching ? "Ищем…" : "Найти"}</Button>
        </form>
        {searchError && <p className="mt-3 text-sm text-[#FF8074]" role="alert">{searchError}</p>}
        {results && <div aria-live="polite" className="mt-4">{results.length ? users(results) : <p className="text-sm text-muted">Никого не нашли. Проверьте логин.</p>}</div>}
      </section>
    </PanelBody>
  </Panel>;
}
