package com.qlc.services;

import com.qlc.models.entities.Submission;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class RedisQueueService {

  private static final Logger log = LoggerFactory.getLogger(RedisQueueService.class);

  private final StringRedisTemplate redisTemplate;
  private final String streamName;

  public RedisQueueService(StringRedisTemplate redisTemplate,
      @Value("${app.submissions.stream-name:qlc:submissions}") String streamName) {
    this.redisTemplate = redisTemplate;
    this.streamName = streamName;
  }

  public void pushToStream(Submission submission) {
    String uuidStr = submission.getId().toString();

    // Stream contract v1: submissionId is UUID, taskId is Long and sourceCode is
    // the exact submitted text. Source code must never be written to logs.
    Map<String, String> body = Map.of(
        "submissionId", uuidStr,
        "taskId", submission.getTask().getId().toString(),
        "sourceCode", submission.getSourceCode(),
        "schemaVersion", "1");

    redisTemplate.opsForStream().add(streamName, body);
    log.info(
        "Published submissionId={} taskId={} to Redis Stream {}",
        uuidStr,
        submission.getTask().getId(),
        streamName);
  }
}
