package com.qlc.shared.runs;

import org.junit.jupiter.api.*;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import tools.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import static org.assertj.core.api.Assertions.*;

@Tag("redis")
class CodeRunStoreIntegrationTest {
  static LettuceConnectionFactory factory;
  static StringRedisTemplate redis;
  String stream = "qlc:test:runs:" + UUID.randomUUID();
  CodeRunStore store;
  List<String> keys = new ArrayList<>();

  @BeforeAll static void connect() {
    factory = new LettuceConnectionFactory(System.getenv().getOrDefault("QLC_TEST_REDIS_HOST", "127.0.0.1"),
        Integer.parseInt(System.getenv().getOrDefault("QLC_TEST_REDIS_PORT", "6379")));
    factory.afterPropertiesSet();
    redis = new StringRedisTemplate(factory);
  }
  @AfterAll static void disconnect() { factory.destroy(); }
  @BeforeEach void setup() { store = new CodeRunStore(redis, new ObjectMapper(), stream); keys.add(stream + ":runs:queue"); }
  @AfterEach void cleanup() { redis.delete(keys); }

  CodeRunJob job(long userId) {
    var job = new CodeRunJob(UUID.randomUUID(), userId, 42L, "CPP23", "private source",
        List.of(new CodeRunJob.TestCase("public input", null)), 65536, 2000, 64);
    keys.add(key(job)); keys.add(active(job)); keys.add(stream + ":runs:cooldown:" + userId);
    return job;
  }
  String key(CodeRunJob job) { return stream + ":runs:job:" + job.id(); }
  String active(CodeRunJob job) { return stream + ":runs:active:" + job.userId(); }
  void expire(CodeRunJob job) {
    redis.opsForHash().put(key(job), "deadline", "1");
    redis.delete(stream + ":runs:cooldown:" + job.userId());
  }

  @Test void ownerOnlySingleClaimAndBoundedRetention() {
    var job = job(7);
    assertThat(store.enqueue(job)).isEqualTo(1);
    assertThat(store.find(job.id(), 8L)).isNull();
    assertThat(store.find(job.id(), 7L).status()).isEqualTo("QUEUED");
    assertThat(redis.getExpire(key(job))).isBetween(1L, 900L);
    assertThat(store.claim()).isEqualTo(job);
    assertThat(store.claim()).isNull();
    assertThat(store.find(job.id(), 7L).status()).isEqualTo("RUNNING");
    var result = new CodeRunResult(job.id(), "FINISHED", "Done", List.of(
        new CodeRunResult.CaseResult("OK", "5\n", "debug\n", 4, 123L, false, null)));
    store.complete(job, result);
    assertThat(store.find(job.id(), 7L)).isEqualTo(result);
    assertThat(redis.opsForHash().hasKey(key(job), "payload")).isFalse();
    assertThat(redis.hasKey(active(job))).isFalse();
  }

  @Test void concurrentRequestsCannotBypassPerUserLimit() throws Exception {
    var first = job(7); var second = job(7);
    try (var pool = Executors.newFixedThreadPool(2)) {
      var left = pool.submit(() -> store.enqueue(first));
      var right = pool.submit(() -> store.enqueue(second));
      assertThat(List.of(left.get(), right.get())).containsExactlyInAnyOrder(0L, 1L);
    }
    assertThat(redis.opsForZSet().zCard(stream + ":runs:queue")).isEqualTo(1);
  }

  @Test void queueHasGlobalBackpressure() {
    for (long user = 1; user <= 50; user++) assertThat(store.enqueue(job(user))).isEqualTo(1);
    assertThat(store.enqueue(job(51))).isEqualTo(-1);
  }

  @Test void deadWorkerExpiresAndLateResultCannotReleaseNewRun() {
    var old = job(7); store.enqueue(old); store.claim(); expire(old);
    assertThat(store.find(old.id(), 7L).status()).isEqualTo("ERROR");
    var next = job(7);
    assertThat(store.enqueue(next)).isEqualTo(1);
    store.complete(old, new CodeRunResult(old.id(), "FINISHED", "late", List.of()));
    assertThat(redis.opsForValue().get(active(next))).isEqualTo(next.id().toString());
    assertThat(store.find(old.id(), 7L).status()).isEqualTo("ERROR");
  }

  @Test void expiredQueueEntriesAreNotExecuted() {
    var old = job(7); store.enqueue(old); expire(old);
    redis.opsForZSet().add(stream + ":runs:queue", old.id().toString(), 1);
    assertThat(store.claim()).isNull();
    assertThat(store.find(old.id(), 7L).status()).isEqualTo("ERROR");
  }
}
