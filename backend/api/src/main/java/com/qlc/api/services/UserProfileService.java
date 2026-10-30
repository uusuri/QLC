package com.qlc.api.services;

import com.qlc.api.models.dtos.FriendUser;
import com.qlc.shared.model.dtos.ExperienceSummary;
import com.qlc.shared.services.ExperienceService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Public projections deliberately never load email, Telegram, passwords or submitted code. */
@Service
@Transactional(readOnly = true)
public class UserProfileService {
  private static final ZoneId ACTIVITY_ZONE = ZoneId.of("Europe/Moscow");
  private final JdbcTemplate jdbc;
  private final ExperienceService experience;
  private final FriendService friends;
  private final ZoneId storageZone;

  public UserProfileService(JdbcTemplate jdbc, ExperienceService experience, FriendService friends,
      @Value("${app.profiles.activity.storage-zone:}") String storageZone) {
    this.jdbc = jdbc;
    this.experience = experience;
    this.friends = friends;
    // Existing submissions store LocalDateTime, i.e. the JVM's local wall-clock time, not an instant.
    this.storageZone = storageZone.isBlank() ? ZoneId.systemDefault() : ZoneId.of(storageZone);
  }

  public Profile profile(String username, Long viewerId) {
    Account account = account(username);
    boolean accessible = visible(account, viewerId);
    var relationship = friends.relationship(viewerId, account.id());
    if (!accessible) {
      return new Profile(account.id(), account.username(), true, false, false,
          null, null, null, null, null, relationship);
    }
    Long solved = jdbc.queryForObject("""
        SELECT COUNT(DISTINCT task_id) FROM submissions
        WHERE user_id = ? AND status = 'FINISHED' AND verdict = 'AC' AND counts_for_progress = TRUE
        """, Long.class, account.id());
    Long attempts = jdbc.queryForObject("SELECT COUNT(*) FROM submissions WHERE user_id = ?", Long.class, account.id());
    Long friendCount = jdbc.queryForObject(
        "SELECT COUNT(*) FROM friendships WHERE user_id = ? OR friend_id = ?", Long.class, account.id(), account.id());
    return new Profile(account.id(), account.username(), account.privateProfile(), true, account.hasAvatar(),
        account.registeredAt(), experience.summary(account.id()), solved, attempts, friendCount, relationship);
  }

  public List<FriendUser> profileFriends(String username, Long viewerId) {
    return friends.listFriends(requireVisible(username, viewerId).id());
  }

  public Activity activity(String username, Long viewerId) {
    Account account = requireVisible(username, viewerId);
    LocalDate to = LocalDate.now(ACTIVITY_ZONE);
    LocalDate from = to.minusDays(364);
    LocalDateTime start = from.atStartOfDay(ACTIVITY_ZONE).withZoneSameInstant(storageZone).toLocalDateTime();
    LocalDateTime end = to.plusDays(1).atStartOfDay(ACTIVITY_ZONE).withZoneSameInstant(storageZone).toLocalDateTime();
    var counts = new HashMap<LocalDate, Long>();
    // Filter by indexed raw timestamps; group in SQL rather than loading every submission into Java.
    jdbc.query("""
        SELECT CAST(TO_CHAR((created_at AT TIME ZONE ?) AT TIME ZONE ?, 'YYYY-MM-DD') AS DATE) AS activity_date,
               COUNT(*) AS attempts
        FROM submissions WHERE user_id = ? AND created_at >= ? AND created_at < ?
        GROUP BY activity_date ORDER BY activity_date
        """, row -> {
          counts.put(row.getObject("activity_date", LocalDate.class), row.getLong("attempts"));
        }, storageZone.getId(), ACTIVITY_ZONE.getId(), account.id(), start, end);
    var days = new ArrayList<ActivityDay>(365);
    long total = 0;
    for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
      long count = counts.getOrDefault(date, 0L);
      days.add(new ActivityDay(date, count));
      total += count;
    }
    return new Activity(from, to, ACTIVITY_ZONE.getId(), total, days);
  }

  public Long visibleUserId(String username, Long viewerId) {
    return requireVisible(username, viewerId).id();
  }

  public DailySubmissions dailySubmissions(Long userId, LocalDate date, int page) {
    LocalDate today = LocalDate.now(ACTIVITY_ZONE);
    if (date == null || date.isAfter(today) || date.isBefore(today.minusDays(364)) || page < 0 || page > 10000) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Выберите день за последний год");
    }
    LocalDateTime start = date.atStartOfDay(ACTIVITY_ZONE).withZoneSameInstant(storageZone).toLocalDateTime();
    LocalDateTime end = date.plusDays(1).atStartOfDay(ACTIVITY_ZONE).withZoneSameInstant(storageZone).toLocalDateTime();
    var rows = jdbc.query("""
        SELECT s.id, s.task_id, t.task_type, t.lesson_id, l.name AS lesson_name,
               s.language, s.status, s.verdict, s.execution_time, s.memory_used, s.created_at
        FROM submissions s JOIN tasks t ON t.id = s.task_id JOIN lessons l ON l.id = t.lesson_id
        WHERE s.user_id = ? AND s.created_at >= ? AND s.created_at < ?
        ORDER BY s.created_at DESC, s.id DESC LIMIT 21 OFFSET ?
        """, (row, number) -> new DailySubmission(row.getObject("id", java.util.UUID.class), row.getLong("task_id"),
            row.getLong("lesson_id"), row.getString("lesson_name"), row.getString("task_type"),
            row.getString("language"), row.getString("status"), row.getString("verdict"),
            row.getObject("execution_time", Long.class), row.getObject("memory_used", Long.class),
            row.getObject("created_at", LocalDateTime.class).atZone(storageZone)
                .withZoneSameInstant(ACTIVITY_ZONE).toOffsetDateTime()),
        userId, start, end, page * 20);
    return new DailySubmissions(date, page, rows.size() > 20, rows.stream().limit(20).toList());
  }

  public List<FriendUser> search(String query, Long viewerId) {
    String prefix = query == null ? "" : query.trim();
    if (prefix.startsWith("@")) prefix = prefix.substring(1);
    if (prefix.length() < 2 || prefix.length() > 32) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Введите от 2 до 32 символов логина");
    }
    String escaped = prefix.toLowerCase(java.util.Locale.ROOT)
        .replace("!", "!!").replace("%", "!%").replace("_", "!_");
    return jdbc.query("""
        SELECT u.id, u.username,
               (NOT u.private_profile AND EXISTS (SELECT 1 FROM user_avatars a WHERE a.user_id = u.id)) AS has_avatar
        FROM users u WHERE LOWER(u.username) LIKE ? ESCAPE '!' AND u.id <> ?
        ORDER BY LOWER(u.username), u.id LIMIT 20
        """, (row, number) -> new FriendUser(row.getLong("id"), row.getString("username"), row.getBoolean("has_avatar")),
        escaped + "%", viewerId);
  }

  @Transactional
  public Privacy updatePrivacy(Long userId, boolean privateProfile) {
    if (jdbc.update("UPDATE users SET private_profile = ? WHERE id = ?", privateProfile, userId) != 1) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден");
    }
    return new Privacy(privateProfile);
  }

  private Account requireVisible(String username, Long viewerId) {
    Account account = account(username);
    if (!visible(account, viewerId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Это приватный профиль");
    }
    return account;
  }

  private boolean visible(Account account, Long viewerId) {
    return !account.privateProfile() || Objects.equals(account.id(), viewerId);
  }

  private Account account(String username) {
    return jdbc.query("""
        SELECT u.id, u.username, u.private_profile, u.registration_date,
               EXISTS (SELECT 1 FROM user_avatars a WHERE a.user_id = u.id) AS has_avatar
        FROM users u WHERE u.username = ?
        """, (row, number) -> new Account(row.getLong("id"), row.getString("username"),
            row.getBoolean("private_profile"), row.getObject("registration_date", LocalDateTime.class),
            row.getBoolean("has_avatar")), username).stream().findFirst()
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден"));
  }

  private record Account(Long id, String username, boolean privateProfile, LocalDateTime registeredAt, boolean hasAvatar) {}
  public record Profile(Long id, String username, boolean privateProfile, boolean accessible, boolean hasAvatar,
      LocalDateTime registeredAt, ExperienceSummary experience, Long solvedTasks, Long submissionCount,
      Long friendCount, FriendService.Relationship relationship) {}
  public record Privacy(boolean privateProfile) {}
  public record ActivityDay(LocalDate date, long count) {}
  public record Activity(LocalDate from, LocalDate to, String timeZone, long totalSubmissions, List<ActivityDay> days) {}
  public record DailySubmission(java.util.UUID id, Long taskId, Long lessonId, String lessonName, String taskType,
      String language, String status, String verdict, Long executionTime, Long memoryUsed, OffsetDateTime createdAt) {}
  public record DailySubmissions(LocalDate date, int page, boolean hasNext, List<DailySubmission> items) {}
}
