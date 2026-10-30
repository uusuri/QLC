package com.qlc.shared.model.dtos;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.assertj.core.api.Assertions.*;

class ExperienceSummaryTest {
  @ParameterizedTest
  @CsvSource({"0,1,0,100", "10,1,10,90", "90,1,90,10", "100,2,0,100", "110,2,10,90", "1000,11,0,100"})
  void computesConsistentLevelBoundaries(long xp, long level, int current, int remaining) {
    assertThat(ExperienceSummary.fromTotalXp(xp))
        .isEqualTo(new ExperienceSummary(level, xp, current, 100, remaining));
  }

  @Test
  void rejectsNegativeExperience() {
    assertThatIllegalArgumentException().isThrownBy(() -> ExperienceSummary.fromTotalXp(-1));
  }
}
