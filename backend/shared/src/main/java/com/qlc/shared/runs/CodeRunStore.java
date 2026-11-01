package com.qlc.shared.runs;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Bounded ephemeral queue. Dead workers time out instead of creating eternal pending runs. */
@Component
public class CodeRunStore {
  private static final long QUEUE_TIMEOUT_MS = 120_000;
  private static final long EXECUTION_TIMEOUT_MS = 240_000;
  private static final DefaultRedisScript<Long> ENQUEUE = new DefaultRedisScript<>("""
      local active = redis.call('GET', KEYS[3])
      if active then
        local deadline = tonumber(redis.call('HGET', ARGV[6] .. active, 'deadline') or '0')
        if deadline > tonumber(ARGV[3]) then return 0 end
      end
      if redis.call('EXISTS', KEYS[4]) == 1 then return 0 end
      redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[3])
      if redis.call('ZCARD', KEYS[1]) >= 50 then return -1 end
      redis.call('HSET', KEYS[2], 'payload', ARGV[1], 'user', ARGV[2],
        'status', 'QUEUED', 'deadline', ARGV[4])
      redis.call('EXPIRE', KEYS[2], 900)
      redis.call('SET', KEYS[3], ARGV[5], 'EX', 360)
      redis.call('SET', KEYS[4], '1', 'EX', 2)
      redis.call('ZADD', KEYS[1], ARGV[4], ARGV[5])
      redis.call('EXPIRE', KEYS[1], 900)
      return 1
      """, Long.class);
  private static final DefaultRedisScript<String> CLAIM = new DefaultRedisScript<>("""
      redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
      local entry = redis.call('ZPOPMIN', KEYS[1])
      if #entry == 0 then return nil end
      local key = ARGV[3] .. entry[1]
      if redis.call('HGET', key, 'status') ~= 'QUEUED' then return nil end
      redis.call('HSET', key, 'status', 'RUNNING', 'deadline', ARGV[2])
      return redis.call('HGET', key, 'payload')
      """, String.class);
  private static final DefaultRedisScript<Long> COMPLETE = new DefaultRedisScript<>("""
      if redis.call('HGET', KEYS[1], 'status') ~= 'RUNNING' then return 0 end
      if tonumber(redis.call('HGET', KEYS[1], 'deadline') or '0') < tonumber(ARGV[4]) then return 0 end
      redis.call('HSET', KEYS[1], 'status', ARGV[1], 'result', ARGV[2])
      redis.call('HDEL', KEYS[1], 'payload')
      if redis.call('GET', KEYS[2]) == ARGV[3] then redis.call('DEL', KEYS[2]) end
      return 1
      """, Long.class);

  private final StringRedisTemplate redis;
  private final ObjectMapper json;
  private final String prefix;

  public CodeRunStore(StringRedisTemplate redis, ObjectMapper json,
      @Value("${app.submissions.stream-name:qlc:submissions}") String stream) {
    this.redis = redis;
    this.json = json;
    this.prefix = stream + ":runs:";
  }

  /** 1 = queued, 0 = user busy/rate limited, -1 = queue full. */
  public long enqueue(CodeRunJob job) {
    long now = System.currentTimeMillis();
    Long result = redis.execute(ENQUEUE,
        List.of(prefix + "queue", key(job.id()), active(job.userId()), prefix + "cooldown:" + job.userId()),
        json.writeValueAsString(job), job.userId().toString(), Long.toString(now),
        Long.toString(now + QUEUE_TIMEOUT_MS), job.id().toString(), prefix + "job:");
    if (result == null) throw new IllegalStateException("Redis did not accept the run");
    return result;
  }

  public CodeRunJob claim() {
    long now = System.currentTimeMillis();
    String payload = redis.execute(CLAIM, List.of(prefix + "queue"), Long.toString(now),
        Long.toString(now + EXECUTION_TIMEOUT_MS), prefix + "job:");
    return payload == null ? null : json.readValue(payload, CodeRunJob.class);
  }

  /** Returns nothing for other owners, including administrators. Does not expose source or inputs. */
  public CodeRunResult find(UUID id, Long userId) {
    Map<Object, Object> values = redis.opsForHash().entries(key(id));
    if (userId == null || !userId.toString().equals(values.get("user"))) return null;
    if (values.get("result") instanceof String result) return json.readValue(result, CodeRunResult.class);
    if (Long.parseLong((String) values.get("deadline")) < System.currentTimeMillis()) {
      return new CodeRunResult(id, "ERROR", "Время ожидания запуска истекло. Попробуйте ещё раз.", List.of());
    }
    return new CodeRunResult(id, (String) values.get("status"), null, List.of());
  }

  public void complete(CodeRunJob job, CodeRunResult result) {
    redis.execute(COMPLETE, List.of(key(job.id()), active(job.userId())), result.status(),
        json.writeValueAsString(result), job.id().toString(), Long.toString(System.currentTimeMillis()));
  }

  private String key(UUID id) { return prefix + "job:" + id; }
  private String active(Long userId) { return prefix + "active:" + userId; }
}
