package com.qlc.api.models.dtos;

/** Public identity only: never expose email, Telegram id, or account security fields. */
public record FriendUser(Long id, String username, boolean hasAvatar) {
}
