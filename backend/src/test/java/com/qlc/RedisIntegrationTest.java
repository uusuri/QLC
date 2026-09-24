package com.qlc;

import com.qlc.services.RedisSubmissionStream;
import com.qlc.services.RedisSubmissionWorker;
import com.qlc.services.SubmissionStreamProcessor;
import org.springframework.data.redis.connection.RedisStreamCommands.XClaimOptions;
import org.springframework.data.redis.connection.stream.RecordId;
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
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

@SpringBootTest
@ActiveProfiles("test")
class RedisIntegrationTest {
  @Autowired
  private RedisTemplate<String, Object> redisTemplate;

  @Autowired
  private StringRedisTemplate stringRedisTemplate;

  @Autowired
  private RedisSubmissionStream submissionStream;

  @Test
  @SuppressWarnings("unchecked")
  void newWorkerReclaimsDeadConsumersRecordAndDeletesItAfterProcessing() {
    String stream = "qlc:test:reclaim:" + UUID.randomUUID();
    String group = "test-workers";
    StreamOperations<String, String, String> operations = stringRedisTemplate.opsForStream();
    SubmissionStreamProcessor processor = mock(SubmissionStreamProcessor.class);
    UUID submissionId = UUID.randomUUID();
    try {
      RecordId id = operations.add(stream, Map.of("schemaVersion", "1", "submissionId", submissionId.toString(),
          "taskId", "42", "sourceCode", "int main() { return 0; }"));
      operations.createGroup(stream, ReadOffset.from("0-0"), group);
      operations.read(Consumer.from(group, "dead-worker"), StreamOffset.create(stream, ReadOffset.lastConsumed()));
      assertThat(submissionStream.reclaim(stream, group, "new-worker", Duration.ofMinutes(15), "0-0", 10).records())
          .isEmpty();
      operations.claim(stream, group, "dead-worker",
          XClaimOptions.minIdle(Duration.ZERO).ids(id).idle(Duration.ofMinutes(20)));

      when(processor.process(any())).thenReturn(new SubmissionStreamProcessor.ProcessingResult(
          SubmissionStreamProcessor.ProcessingOutcome.COMPLETED, submissionId, 42L, 24));
      RedisSubmissionWorker worker = new RedisSubmissionWorker(stringRedisTemplate, processor, submissionStream,
          stream, group, "new-worker", 10, 900000);
      worker.poll();

      verify(processor).process(argThat(message -> message.submissionId().equals(submissionId)
          && message.sourceCode().equals("int main() { return 0; }")));
      assertThat(operations.pending(stream, group).getTotalPendingMessages()).isZero();
      assertThat(operations.size(stream)).isZero();
    } finally {
      stringRedisTemplate.delete(stream);
    }
  }

  @Test
  @SuppressWarnings("unchecked")
  void cleanupIsIdempotentAndPreservesUnreadRecords() {
    String stream = "qlc:test:cleanup:" + UUID.randomUUID();
    String group = "test-workers";
    StreamOperations<String, String, String> operations = stringRedisTemplate.opsForStream();
    try {
      RecordId processed = operations.add(stream, Map.of("value", "processed"));
      operations.createGroup(stream, ReadOffset.from("0-0"), group);
      operations.read(Consumer.from(group, "worker"), StreamOffset.create(stream, ReadOffset.lastConsumed()));
      RecordId unread = operations.add(stream, Map.of("value", "unread"));
      submissionStream.acknowledgeAndDelete(stream, group, processed);
      submissionStream.acknowledgeAndDelete(stream, group, processed);
      assertThat(operations.pending(stream, group).getTotalPendingMessages()).isZero();
      assertThat(operations.size(stream)).isEqualTo(1);
      assertThat(operations.read(StreamOffset.fromStart(stream))).extracting(MapRecord::getId).containsExactly(unread);
    } finally {
      stringRedisTemplate.delete(stream);
    }
  }

  @Test
  void workerCreatesGroupOnAnEmptyStream() {
    String stream = "qlc:test:empty:" + UUID.randomUUID();
    try {
      new RedisSubmissionWorker(stringRedisTemplate, mock(SubmissionStreamProcessor.class), submissionStream,
          stream, "test-workers", "worker", 10, 900000).poll();
      assertThat(stringRedisTemplate.opsForStream().groups(stream)).hasSize(1);
    } finally {
      stringRedisTemplate.delete(stream);
    }
  }

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
