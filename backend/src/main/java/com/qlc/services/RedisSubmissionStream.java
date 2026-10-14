package com.qlc.services;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

/** Redis 6.2+ operations for the single consumer group owning the submissions stream. */
@Component
public class RedisSubmissionStream {
  private static final DefaultRedisScript<List> AUTO_CLAIM = new DefaultRedisScript<>(
      "return redis.call('XAUTOCLAIM', KEYS[1], ARGV[1], ARGV[2], ARGV[3], ARGV[4], 'COUNT', ARGV[5])", List.class);
  private static final DefaultRedisScript<Long> ACK_DELETE = new DefaultRedisScript<>(
      "redis.call('XACK', KEYS[1], ARGV[1], ARGV[2]); return redis.call('XDEL', KEYS[1], ARGV[2])", Long.class);

  private final StringRedisTemplate redisTemplate;

  public RedisSubmissionStream(StringRedisTemplate redisTemplate) {
    this.redisTemplate = redisTemplate;
  }

  public ClaimBatch reclaim(String stream, String group, String consumer, Duration minIdle, String cursor, long count) {
    List<?> result = redisTemplate.execute(AUTO_CLAIM, List.of(stream), group, consumer,
        Long.toString(minIdle.toMillis()), cursor, Long.toString(count));
    if (result == null) throw new IllegalStateException("Redis did not return an XAUTOCLAIM result");
    List<MapRecord<String, String, String>> records = new ArrayList<>();
    for (Object raw : (List<?>) result.get(1)) {
      List<?> entry = (List<?>) raw;
      List<?> fields = (List<?>) entry.get(1);
      Map<String, String> body = new LinkedHashMap<>();
      for (int i = 0; i < fields.size(); i += 2) body.put(text(fields.get(i)), text(fields.get(i + 1)));
      records.add(MapRecord.create(stream, body).withId(RecordId.of(text(entry.get(0)))));
    }
    return new ClaimBatch(text(result.get(0)), records);
  }

  // Atomic: a process cannot crash between removing the pending entry and its payload.
  public void acknowledgeAndDelete(String stream, String group, RecordId id) {
    redisTemplate.execute(ACK_DELETE, List.of(stream), group, id.getValue());
  }

  private String text(Object value) {
    return value instanceof byte[] bytes ? new String(bytes, StandardCharsets.UTF_8) : value.toString();
  }

  public record ClaimBatch(String nextCursor, List<MapRecord<String, String, String>> records) { }
}
