package com.qlc.shared.model.dtos;

public record ExperienceSummary(long level, long totalXp, int currentLevelXp,
    int xpRequiredForLevel, int xpRemaining) {
  private static final int XP_PER_LEVEL = 100;

  public static ExperienceSummary fromTotalXp(long totalXp) {
    if (totalXp < 0) throw new IllegalArgumentException("Total XP cannot be negative");
    int current = (int) (totalXp % XP_PER_LEVEL);
    return new ExperienceSummary(totalXp / XP_PER_LEVEL + 1, totalXp,
        current, XP_PER_LEVEL, XP_PER_LEVEL - current);
  }
}
