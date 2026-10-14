package com.qlc.services;

import com.qlc.models.entities.CodeTask;
import com.qlc.models.entities.Submission;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RedisQueueServiceTest {

  @Mock
  private StringRedisTemplate redisTemplate;

  @Mock
  private StreamOperations<String, Object, Object> streamOperations;

  private RedisQueueService queueService;

  @BeforeEach
  void setUp() {
    when(redisTemplate.opsForStream()).thenReturn(streamOperations);
    queueService = new RedisQueueService(redisTemplate, "qlc:submissions");
  }

  @Test
  void producerWritesCompleteVersionOneContract() {
    UUID submissionId = UUID.randomUUID();
    CodeTask task = new CodeTask();
    task.setId(42L);
    task.setStatementMd("Task");

    Submission submission = new Submission();
    submission.setId(submissionId);
    submission.setTask(task);
    submission.setSourceCode("int main() { return 0; }");

    queueService.pushToStream(submission);

    @SuppressWarnings("unchecked")
    ArgumentCaptor<Map<String, String>> bodyCaptor = ArgumentCaptor.forClass(Map.class);
    verify(streamOperations).add(eq("qlc:submissions"), bodyCaptor.capture());
    assertEquals(Map.of(
        "schemaVersion", "1",
        "submissionId", submissionId.toString(),
        "taskId", "42",
        "sourceCode", "int main() { return 0; }"), bodyCaptor.getValue());
  }
}
