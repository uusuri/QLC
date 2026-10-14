package com.qlc.security;

import io.jsonwebtoken.security.SignatureException;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JWTCoreTest {
  @Test
  void refusesBlankShortKeysAndInvalidExpiration() {
    for (String key : new String[] {"", " ".repeat(64), "short", "a".repeat(63)}) {
      assertThatThrownBy(() -> new JWTCore(key, 60_000))
          .isInstanceOf(IllegalArgumentException.class)
          .hasMessage("JWT_SECRET must contain at least 64 UTF-8 bytes");
    }
    assertThatThrownBy(() -> new JWTCore("a".repeat(64), 0))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  void usesConfiguredKeyAndRejectsTokensAfterRotation() {
    JWTCore original = new JWTCore("a".repeat(64), 60_000);
    JWTCore rotated = new JWTCore("b".repeat(64), 60_000);
    UserDetailsImpl user = UserDetailsImpl.fromToken(1L, "test-user", "test@example.com", "ROLE_USER");
    String token = original.generateToken(
        new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    assertThat(original.extractUserId(token)).isEqualTo(1L);
    assertThat(original.isTokenValid(token, user)).isTrue();
    assertThat(rotated.isTokenValid(token, user)).isFalse();
    assertThatThrownBy(() -> rotated.parseClaims(token)).isInstanceOf(SignatureException.class);
  }
}
