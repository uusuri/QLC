package com.qlc.services;

import com.qlc.models.dtos.SubmissionStreamDTO;
import com.qlc.models.messages.SubmissionStreamMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Range;
import org.springframework.data.redis.connection.stream.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "app.submissions.worker.enabled", havingValue = "true", matchIfMissing = true)
public class RedisSubmissionWorker {

  private static final Logger log = LoggerFactory.getLogger(RedisSubmissionWorker.class);
  private static final String SUPPORTED_SCHEMA_VERSION = "1";
  private static final int MAX_RETRY_COUNT = 3;

  private final StringRedisTemplate redisTemplate;
  private final SubmissionStreamProcessor processor;
  private final String streamName;
  private final String consumerGroup;
  private final String consumerName;
  private final long batchSize;

  private volatile boolean consumerGroupReady;

  public RedisSubmissionWorker(
      StringRedisTemplate redisTemplate,
      SubmissionStreamProcessor processor,
      @Value("${app.submissions.stream-name:qlc:submissions}") String streamName,
      @Value("${app.submissions.worker.consumer-group:submission-workers}") String consumerGroup,
      @Value("${app.submissions.worker.batch-size:10}") long batchSize) {
    this.redisTemplate = redisTemplate;
    this.processor = processor;
    this.streamName = streamName;
    this.consumerGroup = consumerGroup;

    // Уникальное имя инстанса для безопасного масштабирования в Docker
    this.consumerName = "qlc-worker-" + UUID.randomUUID().toString().substring(0, 8);
    this.batchSize = batchSize;

    log.info("Initialized RedisSubmissionWorker with unique consumer name: {}", this.consumerName);
  }

  @Scheduled(fixedDelayString = "${app.submissions.worker.poll-delay-ms:500}")
  public void poll() {
    try {
      ensureConsumerGroup();
      consumePendingRecords(); // 1. Чистим зависшие хвосты
      consumeNewRecords(); // 2. Читаем новые поступления
    } catch (DataAccessException exception) {
      consumerGroupReady = false;
      log.warn("Redis submission poll failed: {}", exception.getMessage());
    } catch (RuntimeException exception) {
      log.error("Unexpected submission worker failure", exception);
    }
  }

  @SuppressWarnings("unchecked")
  private void consumePendingRecords() {
    List<MapRecord<String, String, String>> records = redisTemplate.<String, String>opsForStream().read(
        Consumer.from(consumerGroup, consumerName),
        StreamReadOptions.empty().count(batchSize),
        StreamOffset.create(streamName, ReadOffset.from("0-0")));

    if (records == null || records.isEmpty()) {
      return;
    }

    for (MapRecord<String, String, String> record : records) {
      String messageIdStr = record.getId().getValue();

      // Запрашиваем информацию о доставке конкретного ID через Range
      PendingMessages pendingDetails = redisTemplate.opsForStream().pending(
          streamName,
          consumerGroup,
          Range.just(messageIdStr),
          1L);

      long deliveryCount = 0;
      if (pendingDetails != null && !pendingDetails.isEmpty()) {
        deliveryCount = pendingDetails.get(0).getTotalDeliveryCount();
      }

      // Защита от Poison Pill (бесконечного цикла падений)
      if (deliveryCount > MAX_RETRY_COUNT) {
        log.error("Poison pill detected! Message {} exceeded max retries ({}). Acknowledging to drop.",
            record.getId(), deliveryCount);
        acknowledge(record.getId());
        continue;
      }

      processRecord(record);
    }
  }

  @SuppressWarnings("unchecked")
  private void consumeNewRecords() {
    List<MapRecord<String, String, String>> records = redisTemplate.<String, String>opsForStream().read(
        Consumer.from(consumerGroup, consumerName),
        StreamReadOptions.empty().count(batchSize),
        StreamOffset.create(streamName, ReadOffset.from("0-0")));

    if (records == null) {
      return;
    }

    for (MapRecord<String, String, String> record : records) {
      processRecord(record);
    }
  }

  void processRecord(MapRecord<String, String, String> record) {
    SubmissionStreamDTO body = SubmissionStreamDTO.class.cast(record.getValue());

    String schemaVersion = body.schemaVersion();
    String rawSubmissionId = body.submissionId();
    String rawTaskId = body.taskId();
    String sourceCode = body.sourceCode();

    if (!SUPPORTED_SCHEMA_VERSION.equals(schemaVersion)) {
      log.warn("Acknowledging message {} with unsupported schema version {}", record.getId(), schemaVersion);
      acknowledge(record.getId());
      return;
    }

    UUID submissionId;
    Long taskId;
    try {
      submissionId = UUID.fromString(rawSubmissionId);
      taskId = Long.valueOf(rawTaskId);
      if (taskId <= 0 || sourceCode == null || sourceCode.isBlank()) {
        throw new IllegalArgumentException("Invalid taskId or sourceCode");
      }
    } catch (RuntimeException exception) {
      log.warn("Acknowledging malformed message {}: invalid UUID, taskId, or sourceCode", record.getId());
      acknowledge(record.getId());
      return;
    }

    try {
      SubmissionStreamMessage message = new SubmissionStreamMessage(schemaVersion, submissionId, taskId, sourceCode);
      SubmissionStreamProcessor.ProcessingResult result = processor.process(message);
      acknowledge(record.getId());
      log.info("Processed submissionId={} taskId={} outcome={}", result.submissionId(), result.taskId(),
          result.outcome());
    } catch (RuntimeException exception) {
      // Оставляем в pending, при следующем тике deliveryCount увеличится
      log.error("Submission processing failed for submissionId={}; message left pending for retry", submissionId,
          exception);
    }
  }

  private void acknowledge(RecordId recordId) {
    redisTemplate.opsForStream().acknowledge(streamName, consumerGroup, recordId);
  }

  private void ensureConsumerGroup() {
    if (consumerGroupReady) {
      return;
    }
    try {
      redisTemplate.opsForStream().createGroup(streamName, ReadOffset.from("0-0"), consumerGroup);
      consumerGroupReady = true;
    } catch (DataAccessException exception) {
      if (containsBusyGroup(exception)) {
        consumerGroupReady = true;
        return;
      }
      throw exception;
    }
  }

  private boolean containsBusyGroup(Throwable throwable) {
    Throwable current = throwable;
    while (current != null) {
      String message = current.getMessage();
      if (message != null && message.contains("BUSYGROUP")) {
        return true;
      }
      current = current.getCause();
    }
    return false;
  }
}
