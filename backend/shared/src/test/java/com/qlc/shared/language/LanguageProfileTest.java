package com.qlc.shared.language;


import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LanguageProfileTest {
  @Test
  void cppKeepsTaskLimits() {
    LanguageProfile profile = LanguageProfile.forToolchain(Toolchain.CPP23);
    assertEquals(Duration.ofMillis(900), profile.effectiveTime(Duration.ofMillis(900)));
    assertEquals(65_536, profile.effectiveMemoryKb(65_536));
  }

  @Test
  void pythonGetsTimeForSameAlgorithmAndInterpreterMemory() {
    LanguageProfile python312 = LanguageProfile.forToolchain(Toolchain.PYTHON312);
    assertTrue(python312.effectiveTime(Duration.ofMillis(1_000)).toMillis() >= 1_500);
    assertEquals(131_072, python312.effectiveMemoryKb(65_536));
    assertTrue(LanguageProfile.isRunnable("PYTHON312"));
  }

  @Test
  void pypyGetsMoreMemoryWithoutVirtualAddressLimitOrJvmHeapFlag() {
    LanguageProfile profile = LanguageProfile.forToolchain(Toolchain.PYPY312);
    assertEquals(Duration.ofMillis(3_000), profile.effectiveTime(Duration.ofMillis(1_000)));
    assertEquals(262_144, profile.effectiveMemoryKb(65_536));
    assertFalse(profile.useAddressSpaceLimit());
    assertEquals(profile.runCommand(), profile.runCommandForMemory(262_144));
    assertEquals("/opt/pypy/bin/pypy3", profile.runCommand().getFirst());
    assertTrue(LanguageProfile.isRunnable("PYPY312"));
  }

  @Test
  void javaGetsStartupAllowanceAndDoesNotUseAddressSpaceLimit() {
    LanguageProfile profile = LanguageProfile.forToolchain(Toolchain.JAVA21);
    assertEquals(Duration.ofMillis(2_500), profile.effectiveTime(Duration.ofMillis(1_000)));
    assertEquals(262_144, profile.effectiveMemoryKb(65_536));
    assertFalse(profile.useAddressSpaceLimit());
    assertTrue(profile.runCommandForMemory(262_144).contains("-Xmx163840k"));
  }

  @Test
  void unsupportedLanguageCannotBeQueuedForExecution() {
    assertFalse(LanguageProfile.isRunnable("PYTHON311"));
    assertFalse(LanguageProfile.isRunnable("RUST2021"));
    assertThrows(IllegalArgumentException.class,
        () -> LanguageProfile.forToolchain(Toolchain.RUST2021));
  }
}
