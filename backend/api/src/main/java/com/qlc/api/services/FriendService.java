package com.qlc.api.services;

import com.qlc.api.models.dtos.FriendRequests;
import com.qlc.api.models.dtos.FriendUser;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class FriendService {
  // Lists are complete, not silently truncated. Mutations enforce these per-account limits.
  public static final int MAX_FRIENDS = 100;
  public static final int MAX_PENDING_REQUESTS = 100;

  public enum Relationship { SELF, NONE, FRIENDS, INCOMING, OUTGOING }

  private static final RowMapper<FriendUser> USER_MAPPER = (row, index) ->
      new FriendUser(row.getLong("id"), row.getString("username"), row.getBoolean("has_avatar"));
  private final JdbcTemplate db;

  public FriendService(JdbcTemplate db) {
    this.db = db;
  }

  public List<FriendUser> listFriends(Long userId) {
    return db.query("""
        SELECT u.id, u.username,
               (NOT u.private_profile AND EXISTS (SELECT 1 FROM user_avatars a WHERE a.user_id = u.id)) AS has_avatar
        FROM friendships f JOIN users u ON u.id = CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END
        WHERE f.user_id = ? OR f.friend_id = ?
        ORDER BY LOWER(u.username), u.id
        """, USER_MAPPER, userId, userId, userId);
  }

  public FriendRequests requests(Long userId) {
    return new FriendRequests(pendingUsers(userId, false), pendingUsers(userId, true));
  }

  public Relationship relationship(Long viewerId, Long targetId) {
    if (viewerId == null) return Relationship.NONE;
    if (viewerId.equals(targetId)) return Relationship.SELF;
    Pair pair = pair(viewerId, targetId);
    if (areFriends(pair)) return Relationship.FRIENDS;
    Long requester = requester(pair);
    if (requester == null) return Relationship.NONE;
    return requester.equals(viewerId) ? Relationship.OUTGOING : Relationship.INCOMING;
  }

  @Transactional
  public void sendRequest(Long senderId, Long targetId) {
    Pair pair = lockPair(senderId, targetId);
    if (areFriends(pair)) return;
    Long requester = requester(pair);
    if (senderId.equals(requester)) return;
    if (requester != null) {
      throw conflict("У вас уже есть входящая заявка от этого пользователя. Примите её в списке заявок");
    }
    checkFriendCapacity(senderId);
    checkFriendCapacity(targetId);
    if (pendingCount(senderId) >= MAX_PENDING_REQUESTS || pendingCount(targetId) >= MAX_PENDING_REQUESTS) {
      throw conflict("Достигнут лимит в 100 активных заявок в друзья");
    }
    db.update("INSERT INTO friend_requests (user_id, friend_id, requester_id) VALUES (?, ?, ?)",
        pair.first(), pair.second(), senderId);
  }

  @Transactional
  public void acceptRequest(Long receiverId, Long senderId) {
    Pair pair = lockPair(receiverId, senderId);
    if (areFriends(pair)) return;
    Long requester = requester(pair);
    if (requester == null) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Входящая заявка не найдена");
    }
    if (!requester.equals(senderId)) {
      throw conflict("Нельзя принять собственную заявку в друзья");
    }
    checkFriendCapacity(receiverId);
    checkFriendCapacity(senderId);
    db.update("INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)", pair.first(), pair.second());
    deletePending(pair);
  }

  /** The receiver declines an incoming request; the sender cancels an outgoing one. */
  @Transactional
  public void deleteRequest(Long userId, Long otherId) {
    deletePending(lockPair(userId, otherId));
  }

  @Transactional
  public void removeFriend(Long userId, Long otherId) {
    Pair pair = lockPair(userId, otherId);
    db.update("DELETE FROM friendships WHERE user_id = ? AND friend_id = ?", pair.first(), pair.second());
  }

  private List<FriendUser> pendingUsers(Long userId, boolean outgoing) {
    String direction = outgoing ? "r.requester_id = ?" : "r.requester_id <> ?";
    return db.query("""
        SELECT u.id, u.username,
               (NOT u.private_profile AND EXISTS (SELECT 1 FROM user_avatars a WHERE a.user_id = u.id)) AS has_avatar
        FROM friend_requests r JOIN users u ON u.id = CASE WHEN r.user_id = ? THEN r.friend_id ELSE r.user_id END
        WHERE (r.user_id = ? OR r.friend_id = ?) AND %s
        ORDER BY r.created_at DESC, u.id
        """.formatted(direction),
        USER_MAPPER, userId, userId, userId, userId);
  }

  /** All social mutations lock both accounts in the same order, including count-based limits. */
  private Pair lockPair(Long userId, Long otherId) {
    Pair pair = pair(userId, otherId);
    List<Long> accounts = db.queryForList("SELECT id FROM users WHERE id IN (?, ?) ORDER BY id FOR UPDATE",
        Long.class, pair.first(), pair.second());
    if (accounts.size() != 2) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден");
    }
    return pair;
  }

  private Pair pair(Long userId, Long otherId) {
    if (userId == null || otherId == null || userId <= 0 || otherId <= 0 || userId.equals(otherId)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Выберите другого пользователя");
    }
    return new Pair(Math.min(userId, otherId), Math.max(userId, otherId));
  }

  private boolean areFriends(Pair pair) {
    return db.queryForObject("SELECT COUNT(*) FROM friendships WHERE user_id = ? AND friend_id = ?",
        Long.class, pair.first(), pair.second()) > 0;
  }

  private Long requester(Pair pair) {
    List<Long> requesters = db.queryForList(
        "SELECT requester_id FROM friend_requests WHERE user_id = ? AND friend_id = ?",
        Long.class, pair.first(), pair.second());
    return requesters.isEmpty() ? null : requesters.getFirst();
  }

  private long pendingCount(Long userId) {
    return db.queryForObject("SELECT COUNT(*) FROM friend_requests WHERE user_id = ? OR friend_id = ?",
        Long.class, userId, userId);
  }

  private void checkFriendCapacity(Long userId) {
    long count = db.queryForObject("SELECT COUNT(*) FROM friendships WHERE user_id = ? OR friend_id = ?",
        Long.class, userId, userId);
    if (count >= MAX_FRIENDS) throw conflict("Достигнут лимит в 100 друзей");
  }

  private void deletePending(Pair pair) {
    db.update("DELETE FROM friend_requests WHERE user_id = ? AND friend_id = ?", pair.first(), pair.second());
  }

  private ResponseStatusException conflict(String message) {
    return new ResponseStatusException(HttpStatus.CONFLICT, message);
  }

  private record Pair(Long first, Long second) {}
}
