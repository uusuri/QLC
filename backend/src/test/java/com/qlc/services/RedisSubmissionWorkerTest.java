package com.qlc.services;

import com.qlc.models.dtos.SubmissionStreamDTO;
import com.qlc.models.messages.SubmissionStreamMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.connection.stream.ObjectRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

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
    worker = new RedisSubmissionWorker(redisTemplate, processor, STREAM, GROUP, 10L);
  }

  @Test
  void validRecordIsProcessedAndAcknowledged() {
    UUID submissionId = UUID.randomUUID();

    // Создаем типизированный ObjectRecord с нашим новым DTO рекордом
    ObjectRecord<String, SubmissionStreamDTO> record = createMockRecord(
        new SubmissionStreamDTO("1", submissionId.toString(), "42", "int main() {}"));

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
    ObjectRecord<String, SubmissionStreamDTO> record = createMockRecord(
        new SubmissionStreamDTO("1", "not-a-uuid", "42", "int main() {}"));

    when(redisTemplate.opsForStream()).thenReturn(streamOperations);
    when(streamOperations.acknowledge(STREAM, GROUP, RECORD_ID)).thenReturn(1L);

    worker.processRecord(record);

    verify(processor, never()).process(org.mockito.ArgumentMatchers.any());
    verify(streamOperations).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  @Test
  void unsupportedSchemaIsAcknowledgedWithoutProcessing() {
    ObjectRecord<String, SubmissionStreamDTO> record = createMockRecord(
        new SubmissionStreamDTO("2", UUID.randomUUID().toString(), "42", "int main() {}"));

    when(redisTemplate.opsForStream()).thenReturn(streamOperations);
    when(streamOperations.acknowledge(STREAM, GROUP, RECORD_ID)).thenReturn(1L);

    worker.processRecord(record);

    verify(processor, never()).process(org.mockito.ArgumentMatchers.any());
    verify(streamOperations).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  @Test
  void processingFailureLeavesMessagePending() {
    UUID submissionId = UUID.randomUUID();
    ObjectRecord<String, SubmissionStreamDTO> record = createMockRecord(
        new SubmissionStreamDTO("1", submissionId.toString(), "42", "int main() {}"));

    when(processor.process(eq(new SubmissionStreamMessage("1", submissionId, 42L, "int main() {}"))))
        .thenThrow(new IllegalStateException("database unavailable"));

    worker.processRecord(record);

    // Убеждаемся, что acknowledge НЕ вызывается при падении бизнес-логики
    verify(streamOperations, never()).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  @Test
  void invalidLongTaskIdIsAcknowledgedWithoutProcessing() {
    ObjectRecord<String, SubmissionStreamDTO> record = createMockRecord(
        new SubmissionStreamDTO("1", UUID.randomUUID().toString(), "not-a-long", "int main() {}"));

    when(redisTemplate.opsForStream()).thenReturn(streamOperations);
    when(streamOperations.acknowledge(STREAM, GROUP, RECORD_ID)).thenReturn(1L);

    worker.processRecord(record);

    verify(processor, never()).process(org.mockito.ArgumentMatchers.any());
    verify(streamOperations).acknowledge(STREAM, GROUP, RECORD_ID);
  }

  /**
   * Вспомогательный метод для генерации типизированного мока ObjectRecord
   */
  @SuppressWarnings("unchecked")
  private ObjectRecord<String, SubmissionStreamDTO> createMockRecord(SubmissionStreamDTO value) {
    ObjectRecord<String, SubmissionStreamDTO> record = org.mockito.Mockito.mock(ObjectRecord.class);
    org.mockito.Mockito.lenient().when(record.getId()).thenReturn(RECORD_ID);
    org.mockito.Mockito.when(record.getValue()).thenReturn(value);
    return record;
  }
}
