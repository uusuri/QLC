package com.qlc.services;

import com.qlc.models.messages.SubmissionStreamMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.PendingMessage;
import org.springframework.data.redis.connection.stream.PendingMessages;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.util.List;
import java.util.UUID;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RedisSubmissionWorkerTest {

  private static final String STREAM = "qlc:submissions";
  private static final String GROUP = "submission-workers";
  private static final String CONSUMER = "qlc-worker-test";
  private static final RecordId RECORD_ID = RecordId.of("1-0");

  @Mock
  private StringRedisTemplate redisTemplate;

  @Mock
  private StreamOperations<String, String, String> streamOperations;

  @Mock
  private SubmissionStreamProcessor processor;

  @Mock
  private PendingMessages pendingMessages;

  @Mock
  private PendingMessage pendingMessage;

  private RedisSubmissionWorker worker;

  @BeforeEach
  void setUp() {
    worker = new RedisSubmissionWorker(redisTemplate, processor, STREAM, GROUP, CONSUMER, 10L);
  }

  @Test
  void validRecordIsProcessedAndAcknowledged() {
    UUID submissionId = UUID.randomUUID();

    MapRecord<String, String, String> record = createMockRecord(
        "1", submissionId.toString(), "42", "int main() {}");

    SubmissionStreamMessage message = new SubmissionStreamMessage("1", submissionId, 42L, "int main() {}");

    when(processor.process(message)).thenReturn(new SubmissionStreamProcessor.ProcessingResult(
        SubmissionStreamProcessor.ProcessingOutcome.COMPLETED,
        submissionId,
        42L,
        21));

    when(redisTemplate.<String, String>opsForStream()).thenReturn(streamOperations);
    when(streamOperations.acknowledge(STREAM, GROUP, RECORD_ID)).thenReturn(1L);

    worker.processRecord(record);

    verify(processor).process(message);
    verify(streamOperations).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  @Test
  void malformedUuidIsAcknowledgedAsPoisonMessage() {
    MapRecord<String, String, String> record = createMockRecord(
        "1", "not-a-uuid", "42", "int main() {}");

    when(redisTemplate.<String, String>opsForStream()).thenReturn(streamOperations);
    when(streamOperations.acknowledge(STREAM, GROUP, RECORD_ID)).thenReturn(1L);

    worker.processRecord(record);

    verify(processor, never()).process(org.mockito.ArgumentMatchers.any());
    verify(streamOperations).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  @Test
  void unsupportedSchemaIsAcknowledgedWithoutProcessing() {
    UUID submissionId = UUID.randomUUID();
    MapRecord<String, String, String> record = createMockRecord(
        "2", submissionId.toString(), "42", "int main() {}");

    when(redisTemplate.<String, String>opsForStream()).thenReturn(streamOperations);
    when(streamOperations.acknowledge(STREAM, GROUP, RECORD_ID)).thenReturn(1L);

    worker.processRecord(record);

    verify(processor, never()).process(org.mockito.ArgumentMatchers.any());
    verify(processor).markInfrastructureFailure(
        submissionId,
        SubmissionStreamProcessor.UNSUPPORTED_SCHEMA_MESSAGE);
    verify(streamOperations).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  @Test
  void processingFailureLeavesMessagePending() {
    UUID submissionId = UUID.randomUUID();
    MapRecord<String, String, String> record = createMockRecord(
        "1", submissionId.toString(), "42", "int main() {}");

    when(processor.process(eq(new SubmissionStreamMessage("1", submissionId, 42L, "int main() {}"))))
        .thenThrow(new IllegalStateException("database unavailable"));

    worker.processRecord(record);

    // Убеждаемся, что acknowledge НЕ вызывается при падении бизнес-логики
    verify(streamOperations, never()).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  @Test
  void invalidLongTaskIdIsAcknowledgedWithoutProcessing() {
    UUID submissionId = UUID.randomUUID();
    MapRecord<String, String, String> record = createMockRecord(
        "1", submissionId.toString(), "not-a-long", "int main() {}");

    when(redisTemplate.<String, String>opsForStream()).thenReturn(streamOperations);
    when(streamOperations.acknowledge(STREAM, GROUP, RECORD_ID)).thenReturn(1L);

    worker.processRecord(record);

    verify(processor, never()).process(org.mockito.ArgumentMatchers.any());
    verify(processor).markInfrastructureFailure(
        submissionId,
        SubmissionStreamProcessor.MALFORMED_MESSAGE);
    verify(streamOperations).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  @Test
  void poisonRecordMarksSubmissionAsInfrastructureErrorBeforeAcknowledging() {
    UUID submissionId = UUID.randomUUID();
    MapRecord<String, String, String> record = createMockRecord(
        "1", submissionId.toString(), "42", "int main() {}");

    when(redisTemplate.<String, String>opsForStream()).thenReturn(streamOperations);
    when(streamOperations.acknowledge(STREAM, GROUP, RECORD_ID)).thenReturn(1L);

    worker.discardPoisonRecord(record);

    verify(processor).markInfrastructureFailure(
        submissionId,
        SubmissionStreamProcessor.RETRY_EXHAUSTED_MESSAGE);
    verify(streamOperations).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  @Test
  void poisonRecordStaysPendingWhenFailureStatusCannotBeSaved() {
    UUID submissionId = UUID.randomUUID();
    MapRecord<String, String, String> record = createMockRecord(
        "1", submissionId.toString(), "42", "int main() {}");
    org.mockito.Mockito.doThrow(new IllegalStateException("database unavailable"))
        .when(processor)
        .markInfrastructureFailure(submissionId, SubmissionStreamProcessor.RETRY_EXHAUSTED_MESSAGE);

    worker.discardPoisonRecord(record);

    verify(streamOperations, never()).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  @Test
  @SuppressWarnings("unchecked")
  void pollRetriesPendingRecordWithConfiguredConsumerName() {
    UUID submissionId = UUID.randomUUID();
    MapRecord<String, String, String> record = createMockRecord(
        "1", submissionId.toString(), "42", "int main() {}");

    when(redisTemplate.<String, String>opsForStream()).thenReturn(streamOperations);
    when(streamOperations.createGroup(STREAM, ReadOffset.from("0-0"), GROUP)).thenReturn("OK");
    when(streamOperations.read(
        eq(Consumer.from(GROUP, CONSUMER)),
        any(StreamReadOptions.class),
        any(StreamOffset[].class)))
        .thenReturn(List.of(record), List.of());
    when(streamOperations.pending(
        eq(STREAM),
        eq(GROUP),
        any(org.springframework.data.domain.Range.class),
        eq(1L)))
        .thenReturn(pendingMessages);
    when(pendingMessages.isEmpty()).thenReturn(false);
    when(pendingMessages.get(0)).thenReturn(pendingMessage);
    when(pendingMessage.getTotalDeliveryCount()).thenReturn(2L);
    SubmissionStreamMessage message = new SubmissionStreamMessage(
        "1", submissionId, 42L, "int main() {}");
    when(processor.process(message)).thenReturn(new SubmissionStreamProcessor.ProcessingResult(
        SubmissionStreamProcessor.ProcessingOutcome.COMPLETED,
        submissionId,
        42L,
        21));

    worker.poll();

    verify(streamOperations, times(2)).read(
        eq(Consumer.from(GROUP, CONSUMER)),
        any(StreamReadOptions.class),
        any(StreamOffset[].class));
    verify(processor).process(message);
    verify(streamOperations).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  private MapRecord<String, String, String> createMockRecord(
      String schemaVersion,
      String submissionId,
      String taskId,
      String sourceCode) {
    return MapRecord.create(STREAM, Map.of(
        "schemaVersion", schemaVersion,
        "submissionId", submissionId,
        "taskId", taskId,
        "sourceCode", sourceCode))
        .withId(RECORD_ID);
  }
}
