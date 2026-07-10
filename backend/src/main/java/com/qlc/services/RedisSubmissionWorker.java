package com.qlc.services;

import com.qlc.models.messages.SubmissionStreamMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@ConditionalOnProperty(
    name = "app.submissions.worker.enabled",
    havingValue = "true",
    matchIfMissing = true)
public class RedisSubmissionWorker {

  private static final Logger log = LoggerFactory.getLogger(RedisSubmissionWorker.class);
  private static final String SUPPORTED_SCHEMA_VERSION = "1";

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
  }

  @Scheduled(fixedDelayString = "${app.submissions.worker.poll-delay-ms:500}")
  public void poll() {
    try {
      ensureConsumerGroup();
      consume(ReadOffset.from("0-0"));
      consume(ReadOffset.lastConsumed());
    } catch (DataAccessException exception) {
      consumerGroupReady = false;
      log.warn("Redis submission poll failed: {}", exception.getMessage());
    } catch (RuntimeException exception) {
      log.error("Unexpected submission worker failure", exception);
    }
  }

  private void consume(ReadOffset offset) {
    List<MapRecord<String, Object, Object>> records = redisTemplate.opsForStream().read(
        Consumer.from(consumerGroup, consumerName),
        StreamReadOptions.empty().count(batchSize),
        StreamOffset.create(streamName, offset));

    if (records == null) {
      return;
    }

    for (MapRecord<String, Object, Object> record : records) {
      processRecord(record);
    }
  }

  void processRecord(MapRecord<String, Object, Object> record) {
    Map<Object, Object> body = record.getValue();
    String schemaVersion = asString(body.get("schemaVersion"));
    String rawSubmissionId = asString(body.get("submissionId"));
    String rawTaskId = asString(body.get("taskId"));
    String sourceCode = asString(body.get("sourceCode"));

    if (!SUPPORTED_SCHEMA_VERSION.equals(schemaVersion)) {
      log.warn(
          "Acknowledging submission message {} with unsupported schema version {}",
          record.getId(),
          schemaVersion);
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
      log.warn(
          "Acknowledging malformed submission message {}: invalid UUID, Long taskId, or sourceCode",
          record.getId());
      acknowledge(record.getId());
      return;
    }

    try {
      SubmissionStreamMessage message = new SubmissionStreamMessage(
          schemaVersion,
          submissionId,
          taskId,
          sourceCode);
      SubmissionStreamProcessor.ProcessingResult result = processor.process(message);
      acknowledge(record.getId());
      log.info(
          "Processed submissionId={} taskId={} sourceBytes={} outcome={}",
          result.submissionId(),
          result.taskId(),
          result.sourceSizeBytes(),
          result.outcome());
    } catch (RuntimeException exception) {
      // No ACK: the record remains pending and is retried by this configured
      // consumer name on the next poll. Full cross-consumer reclaim is future work.
      log.error("Submission processing failed for submissionId={}; message left pending", submissionId, exception);
    }
  }

  private void acknowledge(RecordId recordId) {
    Long acknowledged = redisTemplate.opsForStream().acknowledge(streamName, consumerGroup, recordId);
    if (acknowledged == null || acknowledged == 0) {
      log.debug("Redis message {} was already acknowledged or not pending", recordId);
    }
  }

  private String asString(Object value) {
    return value == null ? null : value.toString();
  }

  private void ensureConsumerGroup() {
    if (consumerGroupReady) {
      return;
    }

    try {
      redisTemplate.opsForStream().createGroup(
          streamName,
          ReadOffset.from("0-0"),
          consumerGroup);
      consumerGroupReady = true;
      log.info("Created Redis Stream consumer group {} for {}", consumerGroup, streamName);
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
