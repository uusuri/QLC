package com.qlc.services;

import com.qlc.models.entities.Submission;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class RedisQueueService {

  private final StringRedisTemplate redisTemplate;
  private final String streamName;

  public RedisQueueService(StringRedisTemplate redisTemplate,
      @Value("${app.submissions.stream-name:qlc:submissions}") String streamName) {
    this.redisTemplate = redisTemplate;
    this.streamName = streamName;
  }

  public void pushToStream(Submission submission) {
    String uuidStr = submission.getId().toString();

    // Message содержит только submissionId и schema version (передаем строку "1")
    Map<String, String> body = Map.of(
        "submissionId", uuidStr,
        "schemaVersion", "1");

    // Важно: .add() отправляет сообщение в Stream очередь
    redisTemplate.opsForStream().add(streamName, body);

    System.out.println("[Redis Stream] ID отправлен в очередь qlc:submissions: " + uuidStr);
  }
}
