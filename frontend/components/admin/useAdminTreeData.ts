"use client";

import { useCallback, useRef, useState } from "react";
import { getAdminLessons, getAdminModules, getAdminTasks } from "@/services/api";

export type Branch<T> = { items?: T[]; loading: boolean; error: string };

// The editor and the navigation share requests and data. Expanding a branch never changes selection.
function useBranches<T>(fetchItems: (id: number) => Promise<T[]>) {
  const [branches, setBranches] = useState<Record<number, Branch<T>>>({});
  const cache = useRef(new Map<number, T[]>());
  const pending = useRef(new Map<number, Promise<T[]>>());
  const revisions = useRef(new Map<number, number>());

  const put = useCallback((id: number, items: T[]) => {
    revisions.current.set(id, (revisions.current.get(id) ?? 0) + 1);
    cache.current.set(id, items);
    setBranches(current => ({ ...current, [id]: { items, loading: false, error: "" } }));
  }, []);

  const load = useCallback((id: number, retry = false): Promise<T[]> => {
    const running = pending.current.get(id);
    if (running) return running;
    const cached = cache.current.get(id);
    if (cached && !retry) return Promise.resolve(cached);
    const revision = revisions.current.get(id) ?? 0;
    setBranches(current => ({ ...current, [id]: { items: cached, loading: true, error: "" } }));
    const request = fetchItems(id).then(items => {
      // A save that completed while this request ran is newer than its response.
      if ((revisions.current.get(id) ?? 0) === revision) put(id, items);
      return cache.current.get(id) ?? items;
    }).catch(error => {
      if ((revisions.current.get(id) ?? 0) === revision) {
        setBranches(current => ({ ...current, [id]: { items: cached, loading: false, error: error instanceof Error ? error.message : "Не удалось загрузить материалы" } }));
      }
      throw error;
    }).finally(() => pending.current.delete(id));
    pending.current.set(id, request);
    return request;
  }, [fetchItems, put]);

  return { branches, load, put };
}

export function useAdminTreeData() {
  return {
    modules: useBranches(getAdminModules),
    lessons: useBranches(getAdminLessons),
    tasks: useBranches(getAdminTasks)
  };
}
