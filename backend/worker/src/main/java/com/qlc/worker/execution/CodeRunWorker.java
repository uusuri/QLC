package com.qlc.worker.execution;

import com.qlc.shared.language.Toolchain;
import com.qlc.shared.runs.CodeRunJob;
import com.qlc.shared.runs.CodeRunResult;
import com.qlc.shared.runs.CodeRunStore;
import com.qlc.worker.runners.DockerCodeRunner;
import com.qlc.worker.runners.RunRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import java.time.Duration;
import java.util.List;

/** One custom-run container at a time per worker. No submission/progress/XP repositories. */
@Component
@ConditionalOnProperty(name = "app.submissions.worker.enabled", havingValue = "true", matchIfMissing = true)
public class CodeRunWorker {
  private static final Logger log = LoggerFactory.getLogger(CodeRunWorker.class);
  private final CodeRunStore store;
  private final DockerCodeRunner runner;
  private final ObjectMapper json;

  public CodeRunWorker(CodeRunStore store, DockerCodeRunner runner, ObjectMapper json) {
    this.store = store;
    this.runner = runner;
    this.json = json;
  }

  @Scheduled(fixedDelayString = "${app.runs.poll-delay-ms:250}")
  public void poll() {
    CodeRunJob job = null;
    try {
      job = store.claim();
      if (job == null) return;
      var result = runner.run(new RunRequest(job.sourceCode(), json.writeValueAsString(job.tests()),
          job.memoryLimitKb(), Duration.ofMillis(job.timeLimitMs()), job.outputLimitKb(),
          Toolchain.valueOf(job.language()), true));
      store.complete(job, new CodeRunResult(job.id(), "FINISHED", result.safeMessage(), result.tests()));
    } catch (Exception exception) {
      // Do not send Docker paths, Redis internals or source code to the browser.
      log.warn("Custom run failed, runId={}", job == null ? null : job.id(), exception);
      if (exception instanceof InterruptedException) Thread.currentThread().interrupt();
      if (job != null) {
        try {
          store.complete(job, new CodeRunResult(job.id(), "ERROR",
              "Не удалось выполнить запуск. Попробуйте ещё раз.", List.of()));
        } catch (RuntimeException unavailable) {
          log.warn("Could not save custom run result, runId={}", job.id());
        }
      }
    }
  }
}
