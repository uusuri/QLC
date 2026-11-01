package com.qlc.api.services;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import static org.assertj.core.api.Assertions.assertThat;

class ExperienceMigrationTest {
  @Test
  void backfillsOnlyUniqueEligibleAcceptedTasksAndKeepsOldestSource() {
    var dataSource = new DriverManagerDataSource("jdbc:h2:mem:xp-migration-" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
    var db = new JdbcTemplate(dataSource);
    db.execute("create table users(id bigint primary key)");
    db.execute("create table tasks(id bigint primary key, difficulty smallint not null)");
    db.execute("create table submissions(id uuid primary key,user_id bigint,task_id bigint,status varchar(50),verdict varchar(50),counts_for_progress boolean,created_at timestamp)");
    db.update("insert into users values (1), (2)");
    db.update("insert into tasks values (1,1), (2,2), (3,3), (4,1), (5,1)");
    UUID first = UUID.randomUUID();
    db.update("insert into submissions values (?,1,1,'FINISHED','AC',true,'2026-01-01')", first);
    db.update("insert into submissions values (?,1,1,'FINISHED','AC',true,'2026-01-02')", UUID.randomUUID());
    db.update("insert into submissions values (?,1,2,'FINISHED','AC',true,'2026-01-01')", UUID.randomUUID());
    db.update("insert into submissions values (?,2,3,'FINISHED','AC',true,'2026-01-01')", UUID.randomUUID());
    db.update("insert into submissions values (?,1,3,'FINISHED','WA',true,'2026-01-01')", UUID.randomUUID());
    db.update("insert into submissions values (?,1,4,'FINISHED','AC',false,'2026-01-01')", UUID.randomUUID());
    db.update("insert into submissions values (?,1,5,'DEMO','AC',true,'2026-01-01')", UUID.randomUUID());
    db.update("insert into submissions values (?,null,3,'FINISHED','AC',true,'2026-01-01')", UUID.randomUUID());
    new ResourceDatabasePopulator(new ClassPathResource("db/migration/V17__task_experience.sql")).execute(dataSource);
    assertThat(db.queryForObject("select count(*) from user_task_experience", Long.class)).isEqualTo(3);
    assertThat(db.queryForObject("select sum(xp) from user_task_experience where user_id=1", Long.class)).isEqualTo(30);
    assertThat(db.queryForObject("select submission_id from user_task_experience where user_id=1 and task_id=1", UUID.class)).isEqualTo(first);
    db.update("delete from tasks where id=1");
    assertThat(db.queryForObject("select sum(xp) from user_task_experience where user_id=1", Long.class)).isEqualTo(30);
    db.update("delete from users where id=1");
    assertThat(db.queryForObject("select count(*) from user_task_experience where user_id=1", Long.class)).isZero();
  }
}
