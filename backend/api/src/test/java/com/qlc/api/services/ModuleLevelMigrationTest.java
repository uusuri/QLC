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

class ModuleLevelMigrationTest {
  @Test
  void preservesExistingModulesAndRestrictsOnlyAssignedLevels() {
    var source = new DriverManagerDataSource(
        "jdbc:h2:mem:module-level-" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
    var db = new JdbcTemplate(source);
    db.execute("CREATE TABLE modules (id BIGINT PRIMARY KEY, name VARCHAR(255))");
    db.update("INSERT INTO modules VALUES (1,'Existing')");
    new ResourceDatabasePopulator(new ClassPathResource("db/migration/V20__module_learning_level.sql")).execute(source);
    assertThat(db.queryForObject("SELECT name FROM modules WHERE id=1", String.class)).isEqualTo("Existing");
    assertThat(db.queryForObject("SELECT learning_level FROM modules WHERE id=1", Integer.class)).isNull();
    for (int level : new int[] {1, 2, 3}) {
      db.update("UPDATE modules SET learning_level=? WHERE id=1", level);
      assertThat(db.queryForObject("SELECT learning_level FROM modules WHERE id=1", Integer.class)).isEqualTo(level);
    }
    for (int level : new int[] {-1, 0, 4}) {
      assertThatThrownBy(() -> db.update("UPDATE modules SET learning_level=? WHERE id=1", level))
          .isInstanceOf(DataIntegrityViolationException.class);
    }
    db.update("UPDATE modules SET learning_level=NULL WHERE id=1");
    assertThat(db.queryForObject("SELECT COUNT(*) FROM modules", Long.class)).isEqualTo(1L);
  }
}
