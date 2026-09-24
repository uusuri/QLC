package com.qlc.services;

import com.qlc.models.messages.SubmissionStreamMessage;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.connection.stream.*;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RedisSubmissionWorkerTest {
  private static final String STREAM = "qlc:submissions";
  private static final String GROUP = "submission-workers";
  private static final String CONSUMER = "qlc-worker-test";
  private static final RecordId ID = RecordId.of("1-0");
  @Mock StringRedisTemplate redis;
  @Mock StreamOperations<String, String, String> ops;
  @Mock RedisSubmissionStream stream;
  @Mock SubmissionStreamProcessor processor;
  private RedisSubmissionWorker worker;

  @BeforeEach
  void setup() {
    worker = new RedisSubmissionWorker(redis, processor, stream, STREAM, GROUP, CONSUMER, 10, 900000);
  }

  @Test
  void completedRecordIsAcknowledgedAndDeleted() {
    UUID id = UUID.randomUUID();
    when(processor.process(any())).thenReturn(result(id, SubmissionStreamProcessor.ProcessingOutcome.COMPLETED));
    worker.processRecord(record(id));
    verify(stream).acknowledgeAndDelete(STREAM, GROUP, ID);
  }

  @Test
  void missingAndTerminalSubmissionsAreCleanedUpToo() {
    for (var outcome : List.of(SubmissionStreamProcessor.ProcessingOutcome.NOT_FOUND,
        SubmissionStreamProcessor.ProcessingOutcome.ALREADY_TERMINAL)) {
      UUID id = UUID.randomUUID();
      when(processor.process(any())).thenReturn(result(id, outcome));
      worker.processRecord(record(id));
    }
    verify(stream, times(2)).acknowledgeAndDelete(STREAM, GROUP, ID);
  }

  @Test
  void busyAndSupersededExecutionsStayPending() {
    for (var outcome : List.of(SubmissionStreamProcessor.ProcessingOutcome.ALREADY_PROCESSING,
        SubmissionStreamProcessor.ProcessingOutcome.STALE_ATTEMPT)) {
      UUID id = UUID.randomUUID();
      when(processor.process(any())).thenReturn(result(id, outcome));
      worker.processRecord(record(id));
    }
    verifyNoInteractions(stream);
  }

  @Test
  void processingOrDatabaseFailureDoesNotAcknowledge() {
    when(processor.process(any())).thenThrow(new IllegalStateException("database unavailable"));
    worker.processRecord(record(UUID.randomUUID()));
    verifyNoInteractions(stream);
  }

  @Test
  void malformedUuidIsRemoved() {
    worker.processRecord(MapRecord.create(STREAM, Map.of("submissionId", "invalid")).withId(ID));
    verifyNoInteractions(processor);
    verify(stream).acknowledgeAndDelete(STREAM, GROUP, ID);
  }

  @Test
  void unsupportedSchemaRequiresPersistedFailureBeforeCleanup() {
    UUID id = UUID.randomUUID();
    var record = MapRecord.create(STREAM, Map.of("submissionId", id.toString(), "schemaVersion", "2")).withId(ID);
    when(processor.markInfrastructureFailure(id, SubmissionStreamProcessor.UNSUPPORTED_SCHEMA_MESSAGE))
        .thenReturn(false, true);
    worker.processRecord(record);
    verifyNoInteractions(stream);
    worker.processRecord(record);
    verify(stream).acknowledgeAndDelete(STREAM, GROUP, ID);
  }

  @Test
  void malformedTaskRequiresPersistedFailureBeforeCleanup() {
    UUID id = UUID.randomUUID();
    var record = MapRecord.create(STREAM, Map.of("submissionId", id.toString(), "schemaVersion", "1",
        "taskId", "invalid", "sourceCode", "int main() {}")).withId(ID);
    when(processor.markInfrastructureFailure(id, SubmissionStreamProcessor.MALFORMED_MESSAGE)).thenReturn(true);
    worker.processRecord(record);
    verify(stream).acknowledgeAndDelete(STREAM, GROUP, ID);
  }

  @Test
  @SuppressWarnings("unchecked")
  void reclaimUsesReturnedCursorEvenWhenScanBatchIsEmpty() {
    when(redis.<String, String>opsForStream()).thenReturn(ops);
    when(stream.reclaim(STREAM, GROUP, CONSUMER, Duration.ofMinutes(15), "0-0", 10))
        .thenReturn(new RedisSubmissionStream.ClaimBatch("100-0", List.of()));
    when(stream.reclaim(STREAM, GROUP, CONSUMER, Duration.ofMinutes(15), "100-0", 10))
        .thenReturn(new RedisSubmissionStream.ClaimBatch("0-0", List.of(record(UUID.randomUUID()))));
    when(processor.process(any())).thenReturn(result(UUID.randomUUID(), SubmissionStreamProcessor.ProcessingOutcome.COMPLETED));
    worker.poll();
    worker.poll();
    verify(processor).process(any());
    verify(stream).acknowledgeAndDelete(STREAM, GROUP, ID);
    verify(ops, times(1)).createGroup(STREAM, ReadOffset.from("0-0"), GROUP);
    verify(ops, times(4)).read(eq(Consumer.from(GROUP, CONSUMER)), any(StreamReadOptions.class), any(StreamOffset[].class));
  }

  private SubmissionStreamProcessor.ProcessingResult result(UUID id, SubmissionStreamProcessor.ProcessingOutcome outcome) {
    return new SubmissionStreamProcessor.ProcessingResult(outcome, id, 42L, 13);
  }

  private MapRecord<String, String, String> record(UUID id) {
    return MapRecord.create(STREAM, Map.of("schemaVersion", "1", "submissionId", id.toString(),
        "taskId", "42", "sourceCode", "int main() {}")).withId(ID);
  }
}
