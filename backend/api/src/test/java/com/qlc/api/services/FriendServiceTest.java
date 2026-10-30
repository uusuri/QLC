package com.qlc.api.services;

import com.qlc.api.models.dtos.FriendUser;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FriendServiceTest {
  private AnnotationConfigApplicationContext context;
  private JdbcTemplate db;
  private FriendService friends;

  @BeforeEach
  void setup() {
    DataSource source = new DriverManagerDataSource(
        "jdbc:h2:mem:friends-" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
    db = new JdbcTemplate(source);
    db.execute("CREATE TABLE users (id BIGINT PRIMARY KEY, username VARCHAR(255) NOT NULL)");
    db.execute("CREATE TABLE user_avatars (user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE)");
    db.execute("""
        CREATE TABLE friendships (
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          friend_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(user_id,friend_id), CHECK(user_id<friend_id))
        """);
    db.execute("CREATE TABLE submissions (id UUID PRIMARY KEY, user_id BIGINT, created_at TIMESTAMP)");
    db.update("INSERT INTO users VALUES (1,'Alice'), (2,'Bob'), (3,'Charlie')");
    new ResourceDatabasePopulator(new ClassPathResource("db/migration/V19__user_social_profiles.sql")).execute(source);
    context = new AnnotationConfigApplicationContext();
    context.register(Transactions.class);
    context.registerBean(JdbcTemplate.class, () -> db);
    context.registerBean(PlatformTransactionManager.class, () -> new DataSourceTransactionManager(source));
    context.registerBean(FriendService.class);
    context.refresh();
    friends = context.getBean(FriendService.class);
  }

  @AfterEach
  void closeContext() {
    if (context != null) context.close();
  }

  @Test
  void requestAcceptAndRemovalAreSymmetricAndIdempotent() {
    assertThat(friends.relationship(1L, 1L)).isEqualTo(FriendService.Relationship.SELF);
    assertThat(friends.relationship(null, 2L)).isEqualTo(FriendService.Relationship.NONE);
    friends.sendRequest(2L, 1L);
    friends.sendRequest(2L, 1L);
    assertThat(count("friend_requests")).isEqualTo(1);
    assertThat(friends.relationship(2L, 1L)).isEqualTo(FriendService.Relationship.OUTGOING);
    assertThat(friends.relationship(1L, 2L)).isEqualTo(FriendService.Relationship.INCOMING);
    assertThat(friends.requests(1L).incoming()).containsExactly(new FriendUser(2L, "Bob", false));
    assertThat(friends.requests(2L).outgoing()).containsExactly(new FriendUser(1L, "Alice", false));
    friends.acceptRequest(1L, 2L);
    friends.acceptRequest(1L, 2L);
    friends.sendRequest(2L, 1L);
    assertThat(count("friend_requests")).isZero();
    assertThat(count("friendships")).isEqualTo(1);
    assertThat(friends.relationship(1L, 2L)).isEqualTo(FriendService.Relationship.FRIENDS);
    assertThat(friends.listFriends(1L)).containsExactly(new FriendUser(2L, "Bob", false));
    assertThat(friends.listFriends(2L)).containsExactly(new FriendUser(1L, "Alice", false));
    friends.removeFriend(2L, 1L);
    friends.removeFriend(2L, 1L);
    assertThat(friends.listFriends(1L)).isEmpty();
    assertThat(friends.relationship(1L, 2L)).isEqualTo(FriendService.Relationship.NONE);
  }

  @Test
  void incomingRequestRequiresExplicitAcceptanceAndSenderCannotAcceptOwnRequest() {
    friends.sendRequest(1L, 2L);
    assertThatThrownBy(() -> friends.sendRequest(2L, 1L))
        .isInstanceOfSatisfying(ResponseStatusException.class,
            error -> assertThat(error.getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
    assertThatThrownBy(() -> friends.acceptRequest(1L, 2L))
        .isInstanceOfSatisfying(ResponseStatusException.class,
            error -> assertThat(error.getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
    assertThatThrownBy(() -> friends.acceptRequest(3L, 1L))
        .isInstanceOfSatisfying(ResponseStatusException.class,
            error -> assertThat(error.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    assertThat(count("friendships")).isZero();
    assertThat(count("friend_requests")).isEqualTo(1);
  }

  @Test
  void eitherParticipantCanDeleteRequestButOtherPairsAreUnaffected() {
    friends.sendRequest(1L, 2L);
    friends.deleteRequest(3L, 1L);
    assertThat(count("friend_requests")).isEqualTo(1);
    friends.deleteRequest(2L, 1L);
    friends.deleteRequest(2L, 1L);
    assertThat(count("friend_requests")).isZero();
    friends.sendRequest(1L, 2L);
    friends.deleteRequest(1L, 2L);
    assertThat(count("friend_requests")).isZero();
  }

  @Test
  void rejectsSelfInvalidAndMissingAccountsWithoutCreatingRelationships() {
    for (Long target : List.of(0L, -1L, 1L)) {
      assertThatThrownBy(() -> friends.sendRequest(1L, target))
          .isInstanceOfSatisfying(ResponseStatusException.class,
              error -> assertThat(error.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
    }
    assertThatThrownBy(() -> friends.sendRequest(1L, 999L))
        .isInstanceOfSatisfying(ResponseStatusException.class,
            error -> assertThat(error.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
    assertThat(count("friend_requests")).isZero();
  }

  @Test
  void listsOnlyTheOtherPublicIdentityAndHidesPrivateAvatars() {
    db.update("INSERT INTO user_avatars VALUES (2),(3)");
    friends.sendRequest(1L, 2L);
    friends.acceptRequest(2L, 1L);
    friends.sendRequest(3L, 1L);
    assertThat(friends.listFriends(1L).getFirst().hasAvatar()).isTrue();
    assertThat(friends.requests(1L).incoming().getFirst().hasAvatar()).isTrue();
    db.update("UPDATE users SET private_profile=TRUE WHERE id IN (2,3)");
    assertThat(friends.listFriends(1L).getFirst().hasAvatar()).isFalse();
    assertThat(friends.requests(1L).incoming().getFirst().hasAvatar()).isFalse();
    assertThat(friends.listFriends(3L)).isEmpty();
    assertThat(friends.requests(2L).incoming()).isEmpty();
    assertThat(friends.requests(2L).outgoing()).isEmpty();
  }

  @Test
  void capsPendingRequestsWithoutSilentlyDroppingAnyFromTheList() {
    for (long id = 4; id <= 103; id++) {
      db.update("INSERT INTO users (id,username) VALUES (?,?)", id, "Person" + id);
      friends.sendRequest(1L, id);
    }
    assertThat(friends.requests(1L).outgoing()).hasSize(FriendService.MAX_PENDING_REQUESTS);
    assertThatThrownBy(() -> friends.sendRequest(1L, 2L)).isInstanceOf(ResponseStatusException.class);
    assertThatThrownBy(() -> friends.sendRequest(2L, 1L)).isInstanceOf(ResponseStatusException.class);
    assertThat(count("friend_requests")).isEqualTo(100);
    friends.deleteRequest(1L, 4L);
    friends.sendRequest(1L, 2L);
    assertThat(count("friend_requests")).isEqualTo(100);
  }

  @Test
  void acceptanceChecksBothAccountsFriendCapacityAndKeepsRequestIfFull() {
    friends.sendRequest(1L, 2L);
    for (long id = 4; id <= 103; id++) {
      db.update("INSERT INTO users (id,username) VALUES (?,?)", id, "Person" + id);
      db.update("INSERT INTO friendships (user_id,friend_id) VALUES (2,?)", id);
    }
    assertThatThrownBy(() -> friends.acceptRequest(2L, 1L)).isInstanceOf(ResponseStatusException.class);
    assertThat(friends.relationship(1L, 2L)).isEqualTo(FriendService.Relationship.OUTGOING);
    assertThat(count("friendships")).isEqualTo(100);
    friends.removeFriend(2L, 4L);
    friends.acceptRequest(2L, 1L);
    assertThat(friends.listFriends(2L)).hasSize(100);
    assertThat(friends.relationship(1L, 2L)).isEqualTo(FriendService.Relationship.FRIENDS);
  }

  @Test
  void simultaneousOppositeRequestsCreateOnePendingPairAndNeverAutoAccept() throws Exception {
    try (var executor = Executors.newFixedThreadPool(2)) {
      var start = new CountDownLatch(1);
      var results = new ArrayList<java.util.concurrent.Future<Integer>>();
      results.add(executor.submit(() -> sendAfter(start, 1L, 2L)));
      results.add(executor.submit(() -> sendAfter(start, 2L, 1L)));
      start.countDown();
      List<Integer> statuses = new ArrayList<>();
      for (var result : results) statuses.add(result.get(5, TimeUnit.SECONDS));
      assertThat(statuses).containsExactlyInAnyOrder(204, 409);
      assertThat(count("friend_requests")).isEqualTo(1);
      assertThat(count("friendships")).isZero();
    }
  }

  @Test
  void concurrentDifferentPairsCannotExceedTheSharedAccountsRequestLimit() throws Exception {
    for (long id = 4; id <= 102; id++) {
      db.update("INSERT INTO users (id,username) VALUES (?,?)", id, "Person" + id);
      friends.sendRequest(1L, id);
    }
    try (var executor = Executors.newFixedThreadPool(2)) {
      var start = new CountDownLatch(1);
      var first = executor.submit(() -> sendAfter(start, 1L, 2L));
      var second = executor.submit(() -> sendAfter(start, 3L, 1L));
      start.countDown();
      assertThat(List.of(first.get(5, TimeUnit.SECONDS), second.get(5, TimeUnit.SECONDS)))
          .containsExactlyInAnyOrder(204, 409);
      assertThat(count("friend_requests")).isEqualTo(FriendService.MAX_PENDING_REQUESTS);
    }
  }

  @Test
  void concurrentAcceptanceStillCreatesExactlyOneFriendship() throws Exception {
    friends.sendRequest(1L, 2L);
    try (var executor = Executors.newFixedThreadPool(2)) {
      var start = new CountDownLatch(1);
      var first = executor.submit(() -> { start.await(); friends.acceptRequest(2L, 1L); return true; });
      var second = executor.submit(() -> { start.await(); friends.acceptRequest(2L, 1L); return true; });
      start.countDown();
      assertThat(first.get(5, TimeUnit.SECONDS)).isTrue();
      assertThat(second.get(5, TimeUnit.SECONDS)).isTrue();
      assertThat(count("friend_requests")).isZero();
      assertThat(count("friendships")).isEqualTo(1);
    }
  }

  private int sendAfter(CountDownLatch start, Long from, Long to) throws InterruptedException {
    start.await();
    try {
      friends.sendRequest(from, to);
      return 204;
    } catch (ResponseStatusException error) {
      return error.getStatusCode().value();
    }
  }

  private long count(String table) {
    return db.queryForObject("SELECT COUNT(*) FROM " + table, Long.class);
  }

  @Configuration(proxyBeanMethods = false)
  @EnableTransactionManagement
  static class Transactions {}
}
