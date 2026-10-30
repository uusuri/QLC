package com.qlc.api.services;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SocialProfileMigrationTest {
  @Test
  void keepsExistingUsersPublicPreservesFriendsAndEnforcesPendingPairConstraintsAndCascade() {
    var source = new DriverManagerDataSource(
        "jdbc:h2:mem:social-migration-" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
    var db = new JdbcTemplate(source);
    db.execute("CREATE TABLE users (id BIGINT PRIMARY KEY)");
    db.execute("""
        CREATE TABLE friendships (
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          friend_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(user_id,friend_id), CHECK(user_id<friend_id))
        """);
    db.execute("CREATE TABLE submissions (id UUID PRIMARY KEY, user_id BIGINT, created_at TIMESTAMP)");
    db.update("INSERT INTO users VALUES (1),(2),(3)");
    db.update("INSERT INTO friendships (user_id,friend_id) VALUES (1,2)");
    new ResourceDatabasePopulator(new ClassPathResource("db/migration/V19__user_social_profiles.sql")).execute(source);
    assertThat(db.queryForList("SELECT private_profile FROM users", Boolean.class)).containsOnly(false);
    assertThat(db.queryForObject("SELECT COUNT(*) FROM friendships", Long.class)).isEqualTo(1);
    db.update("INSERT INTO friend_requests (user_id,friend_id,requester_id) VALUES (1,3,3)");
    for (String values : new String[] {"1,3,1", "3,1,1", "1,1,1", "2,3,1", "2,99,2"}) {
      assertThatThrownBy(() -> db.update("INSERT INTO friend_requests (user_id,friend_id,requester_id) VALUES (" + values + ")"))
          .isInstanceOf(DataIntegrityViolationException.class);
    }
    db.update("DELETE FROM users WHERE id=1");
    assertThat(db.queryForObject("SELECT COUNT(*) FROM friend_requests", Long.class)).isZero();
    assertThat(db.queryForObject("SELECT COUNT(*) FROM friendships", Long.class)).isZero();
  }
}
