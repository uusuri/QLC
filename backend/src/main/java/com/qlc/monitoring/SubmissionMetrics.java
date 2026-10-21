package com.qlc.monitoring;

import com.qlc.runners.LanguageProfile;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Low-cardinality metrics for the persisted submission lifecycle. */
@Component
public class SubmissionMetrics {
  private static final Logger log = LoggerFactory.getLogger(SubmissionMetrics.class);

  private final MeterRegistry registry;

  public SubmissionMetrics(MeterRegistry registry) {
    this.registry = registry;
  }

  public void queueWaitAfterCommit(String language, LocalDateTime queuedAt, LocalDateTime startedAt) {
    if (queuedAt == null || startedAt == null) return;
    afterCommit(() -> timer("qlc.submission.queue.wait", "language", language(language))
        .record(nonNegativeDuration(queuedAt, startedAt)));
  }

  public void completedAfterCommit(String language, LocalDateTime createdAt, String result) {
    afterCommit(() -> {
      if (createdAt != null) {
        timer("qlc.submission.end.to.end", "language", language(language), "result", result)
            .record(nonNegativeDuration(createdAt, LocalDateTime.now()));
      }
      if ("INFRA_ERROR".equals(result)) {
        Counter.builder("qlc.submission.infra.errors")
            .tag("language", language(language))
            .register(registry)
            .increment();
      }
    });
  }

  public void runnerDuration(String language, String outcome, long elapsedNanos) {
    safely(() -> timer("qlc.submission.runner", "language", language(language), "outcome", outcome)
        .record(Math.max(0, elapsedNanos), TimeUnit.NANOSECONDS));
  }

  public void retryAfterCommit(String language, String reason) {
    afterCommit(() -> Counter.builder("qlc.submission.retries")
        .tags("language", language(language), "reason", reason)
        .register(registry)
        .increment());
  }

  private Timer timer(String name, String... tags) {
    return Timer.builder(name)
        .tags(tags)
        .publishPercentileHistogram()
        .register(registry);
  }

  private static Duration nonNegativeDuration(LocalDateTime start, LocalDateTime end) {
    Duration duration = Duration.between(start, end);
    return duration.isNegative() ? Duration.ZERO : duration;
  }

  private static String language(String value) {
    if (value == null) return "UNKNOWN";
    String normalized = value.trim().toUpperCase(Locale.ROOT);
    return LanguageProfile.isRunnable(normalized) ? normalized : "UNKNOWN";
  }

  private void afterCommit(Runnable recording) {
    if (TransactionSynchronizationManager.isActualTransactionActive()
        && TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
        @Override
        public void afterCommit() {
          safely(recording);
        }
      });
    } else {
      safely(recording);
    }
  }

  private static void safely(Runnable recording) {
    try {
      recording.run();
    } catch (RuntimeException exception) {
      // Telemetry must not change whether a submission is accepted or judged.
      log.warn("Could not record submission metric", exception);
    }
  }
}
