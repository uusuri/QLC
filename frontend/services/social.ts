import type { FriendUserDto, FriendshipRelationship } from "../types";

export function profileHref(username: string): string {
  return `/users/${encodeURIComponent(username)}`;
}

export function friendshipForUser(id: number, selfId: number, data: {
  friends: FriendUserDto[];
  incoming: FriendUserDto[];
  outgoing: FriendUserDto[];
} | null): FriendshipRelationship {
  if (id === selfId) return "SELF";
  if (data?.friends.some(person => person.id === id)) return "FRIENDS";
  if (data?.incoming.some(person => person.id === id)) return "INCOMING";
  if (data?.outgoing.some(person => person.id === id)) return "OUTGOING";
  return "NONE";
}
