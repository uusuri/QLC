package com.qlc.services;

import com.qlc.models.messages.SubmissionStreamMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Range;
import org.springframework.data.redis.connection.stream.*;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "app.submissions.worker.enabled", havingValue = "true", matchIfMissing = true)
public class RedisSubmissionWorker {

  private static final Logger log = LoggerFactory.getLogger(RedisSubmissionWorker.class);
  private static final String SUPPORTED_SCHEMA_VERSION = "1";
  private static final int MAX_DELIVERY_ATTEMPTS = 3;

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
      @Value("${app.submissions.worker.consumer-name:qlc-worker-1}") String consumerName,
      @Value("${app.submissions.worker.batch-size:10}") long batchSize) {
    this.redisTemplate = redisTemplate;
    this.processor = processor;
    this.streamName = streamName;
    this.consumerGroup = consumerGroup;

    this.consumerName = consumerName;
    this.batchSize = batchSize;

    log.info("Initialized RedisSubmissionWorker with consumer name: {}", this.consumerName);
  }

  @Scheduled(fixedDelayString = "${app.submissions.worker.poll-delay-ms:500}")
  public void poll() {
    try {
      ensureConsumerGroup();
      consumePendingRecords();
      consumeNewRecords();
    } catch (DataAccessException exception) {
      consumerGroupReady = false;
      log.warn("Redis submission poll failed: {}", exception.getMessage());
    } catch (RuntimeException exception) {
      log.error("Unexpected submission worker failure", exception);
    }
  }

  @SuppressWarnings("unchecked")
  private void consumePendingRecords() {
    StreamOperations<String, String, String> streamOperations = redisTemplate.opsForStream();
    List<MapRecord<String, String, String>> records = streamOperations.read(
        Consumer.from(consumerGroup, consumerName),
        StreamReadOptions.empty().count(batchSize),
        StreamOffset.create(streamName, ReadOffset.from("0-0")));

    if (records == null || records.isEmpty()) {
      return;
    }

    for (MapRecord<String, String, String> record : records) {
      String messageIdStr = record.getId().getValue();

      PendingMessages pendingDetails = streamOperations.pending(
          streamName,
          consumerGroup,
          Range.just(messageIdStr),
          1L);

      long deliveryCount = 0;
      if (pendingDetails != null && !pendingDetails.isEmpty()) {
        deliveryCount = pendingDetails.get(0).getTotalDeliveryCount();
      }

      if (deliveryCount > MAX_DELIVERY_ATTEMPTS) {
        log.error("Message {} exceeded {} delivery attempts", record.getId(), MAX_DELIVERY_ATTEMPTS);
        discardPoisonRecord(record);
        continue;
      }

      processRecord(record);
    }
  }

  @SuppressWarnings("unchecked")
  private void consumeNewRecords() {
    StreamOperations<String, String, String> streamOperations = redisTemplate.opsForStream();
    List<MapRecord<String, String, String>> records = streamOperations.read(
        Consumer.from(consumerGroup, consumerName),
        StreamReadOptions.empty().count(batchSize),
        StreamOffset.create(streamName, ReadOffset.lastConsumed()));

    if (records == null) {
      return;
    }

    for (MapRecord<String, String, String> record : records) {
      processRecord(record);
    }
  }

  void processRecord(MapRecord<String, String, String> record) {
    Map<String, String> body = record.getValue();

    String schemaVersion = body.get("schemaVersion");
    String rawSubmissionId = body.get("submissionId");
    String rawTaskId = body.get("taskId");
    String sourceCode = body.get("sourceCode");

    UUID submissionId;
    try {
      submissionId = UUID.fromString(rawSubmissionId);
    } catch (RuntimeException exception) {
      log.warn("Acknowledging malformed message {} without a valid submissionId", record.getId());
      acknowledge(record.getId());
      return;
    }

    if (!SUPPORTED_SCHEMA_VERSION.equals(schemaVersion)) {
      log.warn("Rejecting message {} with unsupported schema version {}", record.getId(), schemaVersion);
      markInfrastructureFailureAndAcknowledge(
          record.getId(),
          submissionId,
          SubmissionStreamProcessor.UNSUPPORTED_SCHEMA_MESSAGE);
      return;
    }

    Long taskId;
    try {
      taskId = Long.valueOf(rawTaskId);
      if (taskId <= 0 || sourceCode == null || sourceCode.isBlank()) {
        throw new IllegalArgumentException("Invalid taskId or sourceCode");
      }
    } catch (RuntimeException exception) {
      log.warn("Rejecting malformed message {} for submissionId={}", record.getId(), submissionId);
      markInfrastructureFailureAndAcknowledge(
          record.getId(),
          submissionId,
          SubmissionStreamProcessor.MALFORMED_MESSAGE);
      return;
    }

    try {
      SubmissionStreamMessage message = new SubmissionStreamMessage(schemaVersion, submissionId, taskId, sourceCode);
      SubmissionStreamProcessor.ProcessingResult result = processor.process(message);
      acknowledge(record.getId());
      log.info("Processed submissionId={} taskId={} outcome={}", result.submissionId(), result.taskId(),
          result.outcome());
    } catch (RuntimeException exception) {
      log.error("Submission processing failed for submissionId={}; message left pending for retry", submissionId,
          exception);
    }
  }

  private void markInfrastructureFailureAndAcknowledge(
      RecordId recordId,
      UUID submissionId,
      String safeMessage) {
    try {
      processor.markInfrastructureFailure(submissionId, safeMessage);
      acknowledge(recordId);
    } catch (RuntimeException exception) {
      log.error("Failed to persist infrastructure error for message {}; leaving it pending", recordId, exception);
    }
  }

  void discardPoisonRecord(MapRecord<String, String, String> record) {
    String rawSubmissionId = record.getValue().get("submissionId");
    if (rawSubmissionId == null) {
      log.warn("Acknowledging poison message {} without a submissionId", record.getId());
      acknowledge(record.getId());
      return;
    }

    try {
      UUID submissionId = UUID.fromString(rawSubmissionId);
      markInfrastructureFailureAndAcknowledge(
          record.getId(),
          submissionId,
          SubmissionStreamProcessor.RETRY_EXHAUSTED_MESSAGE);
    } catch (IllegalArgumentException exception) {
      log.warn("Acknowledging poison message {} without a valid submissionId", record.getId());
      acknowledge(record.getId());
    }
  }

  private void acknowledge(RecordId recordId) {
    StreamOperations<String, String, String> streamOperations = redisTemplate.opsForStream();
    streamOperations.acknowledge(streamName, consumerGroup, recordId);
  }

  private void ensureConsumerGroup() {
    if (consumerGroupReady) {
      return;
    }
    try {
      StreamOperations<String, String, String> streamOperations = redisTemplate.opsForStream();
      streamOperations.createGroup(streamName, ReadOffset.from("0-0"), consumerGroup);
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
