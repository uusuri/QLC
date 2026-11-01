package com.qlc.api.models.dtos;

import java.util.List;

/** Each id is the other user's id, and is also the target of request actions. */
public record FriendRequests(List<FriendUser> incoming, List<FriendUser> outgoing) {
}
