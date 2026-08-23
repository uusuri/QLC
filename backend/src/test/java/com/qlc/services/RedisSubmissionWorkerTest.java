package com.qlc.services;

import com.qlc.models.messages.SubmissionStreamMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.util.UUID;
import java.util.Map;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RedisSubmissionWorkerTest {

  private static final String STREAM = "qlc:submissions";
  private static final String GROUP = "submission-workers";
  private static final RecordId RECORD_ID = RecordId.of("1-0");

  @Mock
  private StringRedisTemplate redisTemplate;

  @Mock
  private StreamOperations<String, Object, Object> streamOperations;

  @Mock
  private SubmissionStreamProcessor processor;

  private RedisSubmissionWorker worker;

  @BeforeEach
  void setUp() {
    worker = new RedisSubmissionWorker(redisTemplate, processor, STREAM, GROUP, 10L);
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

    when(redisTemplate.opsForStream()).thenReturn(streamOperations);
    when(streamOperations.acknowledge(STREAM, GROUP, RECORD_ID)).thenReturn(1L);

    worker.processRecord(record);

    verify(processor).process(message);
    verify(streamOperations).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  @Test
  void malformedUuidIsAcknowledgedAsPoisonMessage() {
    MapRecord<String, String, String> record = createMockRecord(
        "1", "not-a-uuid", "42", "int main() {}");

    when(redisTemplate.opsForStream()).thenReturn(streamOperations);
    when(streamOperations.acknowledge(STREAM, GROUP, RECORD_ID)).thenReturn(1L);

    worker.processRecord(record);

    verify(processor, never()).process(org.mockito.ArgumentMatchers.any());
    verify(streamOperations).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  @Test
  void unsupportedSchemaIsAcknowledgedWithoutProcessing() {
    MapRecord<String, String, String> record = createMockRecord(
        "2", UUID.randomUUID().toString(), "42", "int main() {}");

    when(redisTemplate.opsForStream()).thenReturn(streamOperations);
    when(streamOperations.acknowledge(STREAM, GROUP, RECORD_ID)).thenReturn(1L);

    worker.processRecord(record);

    verify(processor, never()).process(org.mockito.ArgumentMatchers.any());
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
    MapRecord<String, String, String> record = createMockRecord(
        "1", UUID.randomUUID().toString(), "not-a-long", "int main() {}");

    when(redisTemplate.opsForStream()).thenReturn(streamOperations);
    when(streamOperations.acknowledge(STREAM, GROUP, RECORD_ID)).thenReturn(1L);

    worker.processRecord(record);

    verify(processor, never()).process(org.mockito.ArgumentMatchers.any());
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
