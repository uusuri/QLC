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

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

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
    worker = new RedisSubmissionWorker(redisTemplate, processor, STREAM, GROUP, "worker-test", 10);
  }

  @Test
  void validRecordIsProcessedAndAcknowledged() {
    UUID submissionId = UUID.randomUUID();
    MapRecord<String, Object, Object> record = record(Map.of(
        "submissionId", submissionId.toString(),
        "taskId", "42",
        "sourceCode", "int main() {}",
        "schemaVersion", "1"));
    SubmissionStreamMessage message = new SubmissionStreamMessage(
        "1", submissionId, 42L, "int main() {}");
    when(processor.process(message)).thenReturn(new SubmissionStreamProcessor.ProcessingResult(
        SubmissionStreamProcessor.ProcessingOutcome.COMPLETED,
        submissionId,
        42L,
        21));
    when(redisTemplate.opsForStream()).thenReturn(streamOperations);
    when(record.getId()).thenReturn(RECORD_ID);
    when(streamOperations.acknowledge(STREAM, GROUP, RECORD_ID)).thenReturn(1L);

    worker.processRecord(record);

    verify(processor).process(message);
    verify(streamOperations).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  @Test
  void malformedUuidIsAcknowledgedAsPoisonMessage() {
    MapRecord<String, Object, Object> record = record(Map.of(
        "submissionId", "not-a-uuid",
        "taskId", "42",
        "sourceCode", "int main() {}",
        "schemaVersion", "1"));
    when(redisTemplate.opsForStream()).thenReturn(streamOperations);
    when(record.getId()).thenReturn(RECORD_ID);
    when(streamOperations.acknowledge(STREAM, GROUP, RECORD_ID)).thenReturn(1L);

    worker.processRecord(record);

    verify(processor, never()).process(org.mockito.ArgumentMatchers.any());
    verify(streamOperations).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  @Test
  void unsupportedSchemaIsAcknowledgedWithoutProcessing() {
    MapRecord<String, Object, Object> record = record(Map.of(
        "submissionId", UUID.randomUUID().toString(),
        "taskId", "42",
        "sourceCode", "int main() {}",
        "schemaVersion", "2"));
    when(redisTemplate.opsForStream()).thenReturn(streamOperations);
    when(record.getId()).thenReturn(RECORD_ID);
    when(streamOperations.acknowledge(STREAM, GROUP, RECORD_ID)).thenReturn(1L);

    worker.processRecord(record);

    verify(processor, never()).process(org.mockito.ArgumentMatchers.any());
    verify(streamOperations).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  @Test
  void processingFailureLeavesMessagePending() {
    UUID submissionId = UUID.randomUUID();
    MapRecord<String, Object, Object> record = record(Map.of(
        "submissionId", submissionId.toString(),
        "taskId", "42",
        "sourceCode", "int main() {}",
        "schemaVersion", "1"));
    when(processor.process(eq(new SubmissionStreamMessage(
        "1", submissionId, 42L, "int main() {}"))))
        .thenThrow(new IllegalStateException("database unavailable"));

    worker.processRecord(record);

    verify(streamOperations, never()).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  @Test
  void invalidLongTaskIdIsAcknowledgedWithoutProcessing() {
    MapRecord<String, Object, Object> record = record(Map.of(
        "submissionId", UUID.randomUUID().toString(),
        "taskId", "not-a-long",
        "sourceCode", "int main() {}",
        "schemaVersion", "1"));
    when(redisTemplate.opsForStream()).thenReturn(streamOperations);
    when(record.getId()).thenReturn(RECORD_ID);
    when(streamOperations.acknowledge(STREAM, GROUP, RECORD_ID)).thenReturn(1L);

    worker.processRecord(record);

    verify(processor, never()).process(org.mockito.ArgumentMatchers.any());
    verify(streamOperations).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  @SuppressWarnings("unchecked")
  private MapRecord<String, Object, Object> record(Map<String, String> values) {
    MapRecord<String, Object, Object> record = org.mockito.Mockito.mock(MapRecord.class);
    Map<Object, Object> body = new HashMap<>(values);
    when(record.getValue()).thenReturn(body);
    return record;
  }
}
