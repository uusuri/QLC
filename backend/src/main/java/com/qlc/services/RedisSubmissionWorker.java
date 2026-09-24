package com.qlc.services;

import com.qlc.models.messages.SubmissionStreamMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.connection.stream.*;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "app.submissions.worker.enabled", havingValue = "true", matchIfMissing = true)
public class RedisSubmissionWorker {

  private static final Logger log = LoggerFactory.getLogger(RedisSubmissionWorker.class);
  private static final String SUPPORTED_SCHEMA_VERSION = "1";

  private final StringRedisTemplate redisTemplate;
  private final SubmissionStreamProcessor processor;
  private final RedisSubmissionStream submissionStream;
  private final Duration reclaimMinIdle;
  private String reclaimCursor = "0-0";
  private final String streamName;
  private final String consumerGroup;
  private final String consumerName;
  private final long batchSize;

  private volatile boolean consumerGroupReady;

  public RedisSubmissionWorker(
      StringRedisTemplate redisTemplate,
      SubmissionStreamProcessor processor,
      RedisSubmissionStream submissionStream,
      @Value("${app.submissions.stream-name:qlc:submissions}") String streamName,
      @Value("${app.submissions.worker.consumer-group:submission-workers}") String consumerGroup,
      @Value("${app.submissions.worker.consumer-name:}") String consumerName,
      @Value("${app.submissions.worker.batch-size:10}") long batchSize,
      @Value("${app.submissions.worker.reclaim-min-idle-ms:900000}") long reclaimMinIdleMs) {
    this.redisTemplate = redisTemplate;
    this.processor = processor;
    this.submissionStream = submissionStream;
    if (batchSize < 1 || reclaimMinIdleMs < 1) throw new IllegalArgumentException("Worker limits must be positive");
    this.reclaimMinIdle = Duration.ofMillis(reclaimMinIdleMs);
    this.streamName = streamName;
    this.consumerGroup = consumerGroup;

    this.consumerName = consumerName.isBlank() ? "qlc-worker-" + UUID.randomUUID() : consumerName;
    this.batchSize = batchSize;

    log.info("Initialized RedisSubmissionWorker with consumer name: {}", this.consumerName);
  }

  @Scheduled(fixedDelayString = "${app.submissions.worker.poll-delay-ms:500}")
  public void poll() {
    try {
      ensureConsumerGroup();
      consumeReclaimedRecords();
      consumePendingRecords();
      consumeNewRecords();
    } catch (DataAccessException exception) {
      consumerGroupReady = false;
      log.warn("Redis submission poll failed: {}", exception.getMessage());
    } catch (RuntimeException exception) {
      log.error("Unexpected submission worker failure", exception);
    }
  }

  private void consumeReclaimedRecords() {
    RedisSubmissionStream.ClaimBatch batch = submissionStream.reclaim(streamName, consumerGroup,
        consumerName, reclaimMinIdle, reclaimCursor, batchSize);
    reclaimCursor = batch.nextCursor();
    for (MapRecord<String, String, String> record : batch.records()) processRecord(record);
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
      if (result.outcome() == SubmissionStreamProcessor.ProcessingOutcome.ALREADY_PROCESSING
          || result.outcome() == SubmissionStreamProcessor.ProcessingOutcome.STALE_ATTEMPT) {
        return;
      }
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
      if (processor.markInfrastructureFailure(submissionId, safeMessage)) acknowledge(recordId);
    } catch (RuntimeException exception) {
      log.error("Failed to persist infrastructure error for message {}; leaving it pending", recordId, exception);
    }
  }

  private void acknowledge(RecordId recordId) {
    submissionStream.acknowledgeAndDelete(streamName, consumerGroup, recordId);
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
