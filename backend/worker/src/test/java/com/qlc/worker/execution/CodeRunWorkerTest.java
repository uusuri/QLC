package com.qlc.worker.execution;

import com.qlc.shared.runs.*;
import com.qlc.shared.model.enums.Verdict;
import com.qlc.worker.runners.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class CodeRunWorkerTest {
  CodeRunStore store = mock(CodeRunStore.class);
  DockerCodeRunner runner = mock(DockerCodeRunner.class);
  ObjectMapper json = new ObjectMapper();
  CodeRunWorker worker = new CodeRunWorker(store, runner, json);
  CodeRunJob job = new CodeRunJob(UUID.randomUUID(), 7L, 42L, "CPP23", "code",
      List.of(new CodeRunJob.TestCase("", null)), 65536, 2000, 64);

  @Test void executesCustomModeAndSavesIndividualResults() throws Exception {
    when(store.claim()).thenReturn(job);
    var cases = List.of(new CodeRunResult.CaseResult("OK", "hello\n", "", 5, 3000L, false, null));
    when(runner.run(any())).thenReturn(new DockerRunnerResult(Verdict.AC, 1, 1, 5, 3000L, "Done", cases));
    worker.poll();
    verify(runner).run(argThat(request -> request.customRun() && request.testCasesJson().contains("input")
        && request.sourceCode().equals("code")));
    verify(store).complete(job, new CodeRunResult(job.id(), "FINISHED", "Done", cases));
  }

  @Test void hidesInfrastructureDiagnosticsAndFinishesFailedRun() throws Exception {
    when(store.claim()).thenReturn(job);
    when(runner.run(any())).thenThrow(new IOException("private server path"));
    worker.poll();
    verify(store).complete(eq(job), argThat(result -> result.status().equals("ERROR")
        && !result.message().contains("private")));
  }

  @Test void idleQueueDoesNotLaunchContainer() {
    worker.poll();
    verifyNoInteractions(runner);
  }
}
