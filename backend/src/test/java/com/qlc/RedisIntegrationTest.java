package com.qlc;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("dev")
class RedisIntegrationTest {
  @Autowired
  private RedisTemplate<String, Object> redisTemplate;

  @Test
  void shouldWriteAndReadDataFromRedis() {
    String key = "qlc:test:integration-key";
    String expectedValue = "Hello from automated JUnit test!";

    redisTemplate.opsForValue().set(key, expectedValue, Duration.ofMinutes(5));

    Object actualValue = redisTemplate.opsForValue().get(key);

    assertThat(actualValue)
        .isNotNull()
        .isEqualTo(expectedValue);

    Boolean isDeleted = redisTemplate.delete(key);
    assertThat(isDeleted).isTrue();
  }
}
