"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

import { getUserAvatar, publicAvatarUrl } from "@/services/api";
import { profileHref } from "@/services/social";
import type { FriendUserDto } from "@/types";

export function UserAvatar({ user, authenticated = false, large = false }: {
  user: FriendUserDto;
  authenticated?: boolean;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [privateUrl, setPrivateUrl] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setFailed(false);
    setPrivateUrl(null);
    if (authenticated && user.hasAvatar) {
      void getUserAvatar(user.username, controller.signal).then(image => {
        if (!controller.signal.aborted && image) {
          objectUrl = URL.createObjectURL(image);
          setPrivateUrl(objectUrl);
        }
      }).catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    }
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [authenticated, user.hasAvatar, user.username]);

  const image = user.hasAvatar && !failed
    ? authenticated ? privateUrl : publicAvatarUrl(user.username)
    : null;

  return <span className={`grid shrink-0 place-items-center overflow-hidden rounded-sm border border-line bg-white/[0.04] font-mono text-acid ${large ? "h-20 w-20 text-3xl sm:h-24 sm:w-24" : "h-8 w-8 text-sm"}`}>
    {image ? <img alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} src={image} />
      : <span aria-hidden="true">{user.username.slice(0, 1).toUpperCase()}</span>}
  </span>;
}

export function SocialUser({ user, children }: { user: FriendUserDto; children?: ReactNode }) {
  return <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-line py-2 first:border-t-0">
    <Link aria-label={`Профиль ${user.username}`} className="shrink-0" href={profileHref(user.username)}><UserAvatar user={user} /></Link>
    <Link className="min-w-0 flex-1 break-words text-sm font-semibold hover:text-acid" href={profileHref(user.username)}>@{user.username}</Link>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </div>;
}
