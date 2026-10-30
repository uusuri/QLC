package com.qlc.api.controllers;

import com.qlc.api.security.UserDetailsImpl;
import com.qlc.shared.model.entities.CodeTask;
import com.qlc.shared.model.entities.Course;
import com.qlc.shared.model.entities.Lesson;
import com.qlc.shared.model.entities.NumericTask;
import com.qlc.shared.model.entities.Submission;
import com.qlc.shared.model.entities.Task;
import com.qlc.shared.model.entities.TestTask;
import com.qlc.shared.model.entities.User;
import com.qlc.shared.model.enums.Role;
import com.qlc.shared.model.enums.SubmissionStatus;
import com.qlc.shared.model.enums.Verdict;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = { "app.profiles.activity.storage-zone=UTC",
    "spring.jpa.properties.hibernate.type.java_time_use_direct_jdbc=true" })
@ActiveProfiles("test")
@Transactional
class UserProfileIntegrationTest {
  private static final ZoneId ACTIVITY_ZONE = ZoneId.of("Europe/Moscow");
  @Autowired EntityManager em;
  @Autowired JdbcTemplate jdbc;
  @Autowired WebApplicationContext context;
  MockMvc mvc;
  User learner, other;
  CodeTask code;
  NumericTask numeric;
  TestTask quiz;

  @BeforeEach
  void fixture() {
    // H2 applies AT TIME ZONE to naive timestamps using the connection zone;
    // PostgreSQL attaches the supplied storage zone directly. Align the H2 session with the fixture.
    jdbc.execute("SET TIME ZONE 'UTC'");
    // Flyway is disabled in integration tests; these tables are intentionally JDBC-only.
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS user_avatars (
          user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          content_type VARCHAR(32) NOT NULL, image_data BYTEA NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP)
        """);
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS friendships (
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          friend_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, friend_id), CHECK (user_id < friend_id))
        """);
    jdbc.execute("""
        CREATE TABLE IF NOT EXISTS friend_requests (
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          friend_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          requester_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, friend_id), CHECK (user_id < friend_id),
          CHECK (requester_id = user_id OR requester_id = friend_id))
        """);
    mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    learner = account("profile-" + UUID.randomUUID());
    other = account("other-" + UUID.randomUUID());
    Course course = new Course();
    course.setName("Profiles"); course.setDescription("Test");
    course.setPrice(BigDecimal.ZERO); course.setPriceInStars(BigDecimal.ZERO); em.persist(course);
    var module = new com.qlc.shared.model.entities.Module();
    module.setCourse(course); module.setName("Test"); module.setDescription("Test"); em.persist(module);
    Lesson lesson = new Lesson(); lesson.setModule(module); lesson.setName("Test");
    lesson.setDescription("Test"); em.persist(lesson);
    code = new CodeTask(); code.setTestCases("PRIVATE_JUDGE_CASES"); saveTask(code, lesson);
    numeric = new NumericTask(); numeric.setCorrectNumericAnswer(BigDecimal.TEN); saveTask(numeric, lesson);
    quiz = new TestTask(); quiz.setOptions(List.of("A", "B"));
    quiz.setCorrectOptionIndexes(List.of(0)); saveTask(quiz, lesson);
    em.flush();
  }

  @AfterEach
  void restoreConnectionZone() {
    jdbc.execute("SET TIME ZONE LOCAL");
  }

  @Test
  void publicProfileExposesOnlySafeStatsAndCountsAcceptedTasksOnce() throws Exception {
    LocalDate today = LocalDate.now(ACTIVITY_ZONE);
    attempt(learner, code, today, SubmissionStatus.FINISHED, Verdict.AC, true);
    attempt(learner, code, today, SubmissionStatus.FINISHED, Verdict.AC, true);
    attempt(learner, numeric, today, SubmissionStatus.FINISHED, Verdict.WA, true);
    attempt(learner, quiz, today, SubmissionStatus.QUEUED, null, true);
    attempt(learner, numeric, today, SubmissionStatus.FINISHED, Verdict.AC, false);
    attempt(other, quiz, today, SubmissionStatus.FINISHED, Verdict.AC, true);
    friendship(learner, other);
    em.flush();
    mvc.perform(profile(learner))
        .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("id").value(learner.getId().intValue()))
        .andExpect(jsonPath("username").value(learner.getUsername()))
        .andExpect(jsonPath("privateProfile").value(false)).andExpect(jsonPath("accessible").value(true))
        .andExpect(jsonPath("registeredAt").isNotEmpty())
        .andExpect(jsonPath("experience.level").value(1)).andExpect(jsonPath("experience.totalXp").value(0))
        .andExpect(jsonPath("solvedTasks").value(1)).andExpect(jsonPath("submissionCount").value(5))
        .andExpect(jsonPath("friendCount").value(1))
        .andExpect(jsonPath("email").doesNotExist()).andExpect(jsonPath("tgId").doesNotExist())
        .andExpect(jsonPath("password").doesNotExist()).andExpect(jsonPath("authVersion").doesNotExist())
        .andExpect(jsonPath("sourceCode").doesNotExist()).andExpect(jsonPath("submittedAnswer").doesNotExist())
        .andExpect(content().string(not(containsString("PRIVATE_"))));
  }

  @Test
  void activityIs365MoscowDaysZeroFilledAndIncludesAllTaskKindsAndOldProgress() throws Exception {
    LocalDate today = LocalDate.now(ACTIVITY_ZONE), first = today.minusDays(364);
    attempt(learner, code, first.minusDays(1), SubmissionStatus.FINISHED, Verdict.AC, true);
    attempt(learner, code, first, SubmissionStatus.FINISHED, Verdict.AC, true);
    attempt(learner, numeric, today, SubmissionStatus.FINISHED, Verdict.WA, true);
    attempt(learner, quiz, today, SubmissionStatus.QUEUED, null, true);
    attempt(learner, code, today, SubmissionStatus.DEMO, null, false);
    attempt(learner, numeric, today.plusDays(1), SubmissionStatus.FINISHED, Verdict.AC, true);
    attempt(other, code, today, SubmissionStatus.FINISHED, Verdict.AC, true);
    // 21:30 UTC belongs to the next Moscow calendar day.
    Submission midnight = attempt(learner, code, today.minusDays(1), SubmissionStatus.FINISHED, Verdict.WA, true);
    midnight.setCreatedAt(today.minusDays(1).atTime(21, 30));
    em.flush();
    mvc.perform(get("/api/users/profiles/{username}/activity", learner.getUsername()))
        .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("from").value(first.toString())).andExpect(jsonPath("to").value(today.toString()))
        .andExpect(jsonPath("timeZone").value("Europe/Moscow"))
        .andExpect(jsonPath("totalSubmissions").value(5)).andExpect(jsonPath("days", hasSize(365)))
        .andExpect(jsonPath("days[0].date").value(first.toString())).andExpect(jsonPath("days[0].count").value(1))
        .andExpect(jsonPath("days[1].count").value(0))
        .andExpect(jsonPath("days[364].date").value(today.toString())).andExpect(jsonPath("days[364].count").value(4))
        .andExpect(content().string(not(containsString("PRIVATE_"))));
  }

  @Test
  void privateProfileHidesEverythingExceptBasicCardEvenFromAFriend() throws Exception {
    friendship(learner, other);
    avatar(learner);
    jdbc.update("UPDATE users SET private_profile = TRUE WHERE id = ?", learner.getId());
    for (MockHttpServletRequestBuilder request : List.of(profile(learner), profile(learner).with(user(UserDetailsImpl.build(other))))) {
      mvc.perform(request).andExpect(status().isOk()).andExpect(jsonPath("accessible").value(false))
          .andExpect(jsonPath("privateProfile").value(true)).andExpect(jsonPath("hasAvatar").value(false))
          .andExpect(jsonPath("registeredAt").doesNotExist()).andExpect(jsonPath("experience").doesNotExist())
          .andExpect(jsonPath("solvedTasks").doesNotExist()).andExpect(jsonPath("submissionCount").doesNotExist())
          .andExpect(jsonPath("friendCount").doesNotExist()).andExpect(jsonPath("email").doesNotExist());
    }
    for (String endpoint : List.of("activity", "friends", "avatar")) {
      mvc.perform(get("/api/users/profiles/{username}/{endpoint}", learner.getUsername(), endpoint))
          .andExpect(status().isForbidden());
      mvc.perform(get("/api/users/profiles/{username}/{endpoint}", learner.getUsername(), endpoint)
          .with(user(UserDetailsImpl.build(other)))).andExpect(status().isForbidden());
      mvc.perform(get("/api/users/profiles/{username}/{endpoint}", learner.getUsername(), endpoint)
          .with(user(UserDetailsImpl.build(learner)))).andExpect(status().isOk());
    }
    mvc.perform(profile(learner).with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk()).andExpect(jsonPath("accessible").value(true))
        .andExpect(jsonPath("hasAvatar").value(true)).andExpect(jsonPath("registeredAt").isNotEmpty());
  }

  @Test
  void privacyCanOnlyChangeCurrentAccountAndRequiresExplicitBoolean() throws Exception {
    mvc.perform(put("/api/users/me/privacy").contentType(MediaType.APPLICATION_JSON).content("{\"privateProfile\":true}"))
        .andExpect(status().isUnauthorized());
    for (String body : List.of("{}", "{\"privateProfile\":null}", "{\"privateProfile\":\"garbage\"}")) {
      mvc.perform(put("/api/users/me/privacy").with(user(UserDetailsImpl.build(learner)))
          .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
    }
    mvc.perform(put("/api/users/me/privacy?userId=" + other.getId()).with(user(UserDetailsImpl.build(learner)))
        .contentType(MediaType.APPLICATION_JSON).content("{\"privateProfile\":true}"))
        .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("privateProfile").value(true));
    assertThat(jdbc.queryForObject("SELECT private_profile FROM users WHERE id = ?", Boolean.class, learner.getId())).isTrue();
    assertThat(jdbc.queryForObject("SELECT private_profile FROM users WHERE id = ?", Boolean.class, other.getId())).isFalse();
    mvc.perform(put("/api/users/me/privacy").with(user(UserDetailsImpl.build(learner)))
        .contentType(MediaType.APPLICATION_JSON).content("{\"privateProfile\":false}"))
        .andExpect(status().isOk()).andExpect(jsonPath("privateProfile").value(false));
    mvc.perform(profile(learner)).andExpect(status().isOk()).andExpect(jsonPath("accessible").value(true));
  }

  @Test
  void publicAvatarIsSafeAndUnknownProfilesAre404() throws Exception {
    byte[] image = avatar(learner);
    mvc.perform(get("/api/users/profiles/{username}/avatar", learner.getUsername()))
        .andExpect(status().isOk()).andExpect(content().contentType(MediaType.IMAGE_PNG))
        .andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(header().string("X-Content-Type-Options", "nosniff"))
        .andExpect(content().bytes(image));
    for (String suffix : List.of("", "/activity", "/friends", "/avatar")) {
      mvc.perform(get("/api/users/profiles/nonexistent-" + UUID.randomUUID() + suffix)).andExpect(status().isNotFound());
    }
    mvc.perform(get("/api/users/profiles/{username}/avatar", other.getUsername())).andExpect(status().isNotFound());
  }

  @Test
  void searchRequiresAuthEscapesWildcardsLimitsResultsAndDoesNotExposePrivateFields() throws Exception {
    mvc.perform(get("/api/users/search?q=profile")).andExpect(status().isUnauthorized());
    for (String q : List.of("", "x", "x".repeat(33))) {
      mvc.perform(get("/api/users/search").param("q", q).with(user(UserDetailsImpl.build(learner))))
          .andExpect(status().isBadRequest());
    }
    String prefix = "zz" + UUID.randomUUID().toString().substring(0, 6);
    User literal = account(prefix + "_literal"), wildcard = account(prefix + "xliteral");
    em.flush(); avatar(literal);
    jdbc.update("UPDATE users SET private_profile = TRUE WHERE id = ?", literal.getId());
    mvc.perform(get("/api/users/search").param("q", prefix + "_").with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].id").value(literal.getId().intValue()))
        .andExpect(jsonPath("$[0].hasAvatar").value(false)).andExpect(jsonPath("$[0].email").doesNotExist())
        .andExpect(jsonPath("$[0].password").doesNotExist()).andExpect(jsonPath("$[0].tgId").doesNotExist());
    mvc.perform(get("/api/users/search").param("q", prefix + "%").with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(0)));
    for (int i = 0; i < 22; i++) account(prefix + "many" + i);
    em.flush();
    mvc.perform(get("/api/users/search").param("q", prefix).with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk()).andExpect(jsonPath("$", hasSize(20)));
    mvc.perform(get("/api/users/search").param("q", learner.getUsername().substring(0, 14))
        .with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk()).andExpect(jsonPath("$[*].id", not(hasItem(learner.getId().intValue()))));
  }

  @Test
  void friendshipHttpApiRequiresAuthenticationAndCannotForgeTheActingAccount() throws Exception {
    for (MockHttpServletRequestBuilder request : List.of(get("/api/friends"), get("/api/friends/requests"),
        post("/api/friends/requests/{id}", other.getId()), put("/api/friends/requests/{id}/accept", other.getId()),
        delete("/api/friends/requests/{id}", other.getId()), delete("/api/friends/{id}", other.getId()))) {
      mvc.perform(request).andExpect(status().isUnauthorized());
    }
    User stranger = account("stranger-" + UUID.randomUUID()); em.flush();
    mvc.perform(post("/api/friends/requests/{id}?requesterId={spoof}", other.getId(), other.getId())
        .with(user(UserDetailsImpl.build(learner)))).andExpect(status().isNoContent());
    assertThat(jdbc.queryForObject("SELECT requester_id FROM friend_requests WHERE user_id = ? AND friend_id = ?",
        Long.class, Math.min(learner.getId(), other.getId()), Math.max(learner.getId(), other.getId())))
        .isEqualTo(learner.getId());
    mvc.perform(get("/api/friends/requests").with(user(UserDetailsImpl.build(other))))
        .andExpect(status().isOk()).andExpect(jsonPath("incoming", hasSize(1)))
        .andExpect(jsonPath("incoming[0].id").value(learner.getId().intValue()))
        .andExpect(jsonPath("incoming[0].email").doesNotExist()).andExpect(jsonPath("outgoing", hasSize(0)));
    mvc.perform(put("/api/friends/requests/{id}/accept", other.getId()).with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isConflict());
    mvc.perform(put("/api/friends/requests/{id}/accept?userId={spoof}", learner.getId(), other.getId())
        .with(user(UserDetailsImpl.build(stranger)))).andExpect(status().isNotFound());
    mvc.perform(put("/api/friends/requests/{id}/accept", learner.getId()).with(user(UserDetailsImpl.build(other))))
        .andExpect(status().isNoContent());
    mvc.perform(get("/api/friends?userId=" + other.getId()).with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].id").value(other.getId().intValue()))
        .andExpect(jsonPath("$[0].email").doesNotExist()).andExpect(jsonPath("$[0].tgId").doesNotExist());
    mvc.perform(delete("/api/friends/{id}?userId={spoof}", other.getId(), learner.getId())
        .with(user(UserDetailsImpl.build(stranger)))).andExpect(status().isNoContent());
    assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM friendships WHERE user_id = ? OR friend_id = ?",
        Long.class, learner.getId(), learner.getId())).isEqualTo(1);
    mvc.perform(delete("/api/friends/{id}", other.getId()).with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isNoContent());
    assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM friendships WHERE user_id = ? OR friend_id = ?",
        Long.class, learner.getId(), learner.getId())).isZero();
  }

  private User account(String username) {
    User account = new User(); account.setUsername(username); account.setEmail("PRIVATE_" + username + "@example.test");
    account.setPassword("PRIVATE_PASSWORD"); account.setRole(Role.ROLE_USER);
    account.setRegistrationDate(LocalDateTime.now()); em.persist(account); return account;
  }

  @Test
  void daySubmissionsAreOwnerOnlyBoundedStableAndDoNotIncludeCodeOrOtherDates() throws Exception {
    LocalDate today = LocalDate.now(ACTIVITY_ZONE);
    for (int i = 0; i < 23; i++) {
      Submission item = attempt(learner, i % 2 == 0 ? code : numeric, today, SubmissionStatus.FINISHED,
          i % 2 == 0 ? Verdict.AC : Verdict.WA, true);
      item.setCreatedAt(today.atTime(9, 0).plusSeconds(i)); // UTC storage -> 12:00 Moscow.
    }
    attempt(other, code, today, SubmissionStatus.FINISHED, Verdict.AC, true);
    attempt(learner, quiz, today.minusDays(1), SubmissionStatus.FINISHED, Verdict.AC, true);
    attempt(learner, quiz, today.plusDays(1), SubmissionStatus.QUEUED, null, true);
    em.flush();
    mvc.perform(get("/api/users/me/activity").param("date", today.toString()))
        .andExpect(status().isUnauthorized());
    mvc.perform(get("/api/users/me/activity").param("date", today.toString()).param("userId", other.getId().toString())
        .with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
        .andExpect(jsonPath("date").value(today.toString())).andExpect(jsonPath("page").value(0))
        .andExpect(jsonPath("items", hasSize(20))).andExpect(jsonPath("hasNext").value(true))
        .andExpect(jsonPath("items[0].taskId").value(code.getId().intValue()))
        .andExpect(jsonPath("items[0].taskType").value("CODE"))
        .andExpect(jsonPath("items[0].createdAt").value(today + "T12:00:22+03:00"))
        .andExpect(jsonPath("items[*].sourceCode").doesNotExist())
        .andExpect(jsonPath("items[*].submittedAnswer").doesNotExist())
        .andExpect(jsonPath("items[*].safeMessage").doesNotExist())
        .andExpect(content().string(not(containsString("PRIVATE_"))));
    mvc.perform(get("/api/users/me/activity").param("date", today.toString()).param("page", "1")
        .with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk()).andExpect(jsonPath("items", hasSize(3))).andExpect(jsonPath("hasNext").value(false));
    mvc.perform(get("/api/users/me/activity").param("date", today.minusDays(2).toString())
        .with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk()).andExpect(jsonPath("items", hasSize(0)));
    for (String invalidDate : List.of("wrong", today.plusDays(1).toString(), today.minusDays(365).toString())) {
      mvc.perform(get("/api/users/me/activity").param("date", invalidDate).with(user(UserDetailsImpl.build(learner))))
          .andExpect(status().isBadRequest());
    }
    mvc.perform(get("/api/users/me/activity").param("date", today.toString()).param("page", "-1")
        .with(user(UserDetailsImpl.build(learner)))).andExpect(status().isBadRequest());
  }

  @Test
  void daySubmissionsUseTheSameMoscowMidnightBoundariesAsCalendar() throws Exception {
    LocalDate today = LocalDate.now(ACTIVITY_ZONE);
    Submission before = attempt(learner, code, today, SubmissionStatus.FINISHED, Verdict.AC, true);
    before.setCreatedAt(today.minusDays(1).atTime(20, 59, 59));
    Submission start = attempt(learner, numeric, today, SubmissionStatus.FINISHED, Verdict.WA, false);
    start.setCreatedAt(today.minusDays(1).atTime(21, 0));
    Submission end = attempt(learner, quiz, today, SubmissionStatus.FINISHED, Verdict.AC, true);
    end.setCreatedAt(today.atTime(20, 59, 59));
    Submission next = attempt(learner, code, today, SubmissionStatus.QUEUED, null, true);
    next.setCreatedAt(today.atTime(21, 0));
    em.flush();
    mvc.perform(get("/api/users/me/activity").param("date", today.toString()).with(user(UserDetailsImpl.build(learner))))
        .andExpect(status().isOk()).andExpect(jsonPath("items", hasSize(2)))
        .andExpect(jsonPath("items[0].id").value(end.getId().toString()))
        .andExpect(jsonPath("items[1].id").value(start.getId().toString()));
  }

  private void saveTask(Task task, Lesson lesson) { task.setLesson(lesson); task.setStatementMd("Test"); em.persist(task); }

  private Submission attempt(User account, Task task, LocalDate day, SubmissionStatus status, Verdict verdict, boolean counts) {
    Submission submission = new Submission(); submission.setUser(account); submission.setTask(task);
    submission.setSourceCode(task instanceof CodeTask ? "PRIVATE_SOURCE" : null);
    submission.setSubmittedAnswer(task instanceof CodeTask ? null : "PRIVATE_ANSWER");
    submission.setStatus(status); submission.setVerdict(verdict); submission.setCountsForProgress(counts);
    em.persist(submission);
    submission.setCreatedAt(day.atTime(12, 0).atZone(ACTIVITY_ZONE).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime());
    return submission;
  }

  private byte[] avatar(User account) {
    byte[] image = { (byte) 137, 80, 78, 71, 13, 10, 26, 10 };
    jdbc.update("INSERT INTO user_avatars (user_id, content_type, image_data) VALUES (?, 'image/png', ?)", account.getId(), image);
    return image;
  }

  private void friendship(User first, User second) {
    jdbc.update("INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)",
        Math.min(first.getId(), second.getId()), Math.max(first.getId(), second.getId()));
  }

  private MockHttpServletRequestBuilder profile(User account) {
    return get("/api/users/profiles/{username}", account.getUsername());
  }
}
