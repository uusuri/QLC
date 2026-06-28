package com.qlc.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class RedisQueueService {

  private final StringRedisTemplate redisTemplate;
  private final String queueName;

  public RedisQueueService(StringRedisTemplate redisTemplate,
      @Value("${app.submissions.queue-name:queue:submissions}") String queueName) {
    this.redisTemplate = redisTemplate;
    this.queueName = queueName;
  }

  public void pushToQueue(UUID submissionId) {
    redisTemplate.opsForList().leftPush(queueName, submissionId.toString());
  }
}
