package com.qlc;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.test.context.ActiveProfiles;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("dev")
class RedisIntegrationTest {
  @Autowired
  private RedisTemplate<String, Object> redisTemplate;

  @Autowired
  private StringRedisTemplate stringRedisTemplate;

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

  @Test
  @SuppressWarnings("unchecked")
  void pendingStreamRecordIsVisibleAfterRestartWithTheSameConsumerName() {
    String stream = "qlc:test:pending:" + UUID.randomUUID();
    String group = "test-workers";
    String consumerName = "stable-worker";
    StreamOperations<String, String, String> streamOperations = stringRedisTemplate.opsForStream();

    try {
      streamOperations.add(stream, Map.of("submissionId", UUID.randomUUID().toString()));
      streamOperations.createGroup(stream, ReadOffset.from("0-0"), group);

      List<MapRecord<String, String, String>> firstDelivery =
          streamOperations.read(
              Consumer.from(group, consumerName),
              StreamOffset.create(stream, ReadOffset.lastConsumed()));

      assertThat(firstDelivery).hasSize(1);

      List<MapRecord<String, String, String>> retryWithDifferentConsumer =
          streamOperations.read(
              Consumer.from(group, "random-worker-after-restart"),
              StreamOffset.create(stream, ReadOffset.from("0-0")));

      assertThat(retryWithDifferentConsumer).isEmpty();

      List<MapRecord<String, String, String>> retryAfterRestart =
          streamOperations.read(
              Consumer.from(group, consumerName),
              StreamOffset.create(stream, ReadOffset.from("0-0")));

      assertThat(retryAfterRestart)
          .extracting(record -> record.getId().getValue())
          .containsExactly(firstDelivery.getFirst().getId().getValue());

      streamOperations.acknowledge(stream, group, firstDelivery.getFirst().getId());
    } finally {
      stringRedisTemplate.delete(stream);
    }
  }
}
