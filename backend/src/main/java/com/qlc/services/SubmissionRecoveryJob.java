package com.qlc.services;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "app.submissions.recovery.enabled", havingValue = "true", matchIfMissing = true)
public class SubmissionRecoveryJob {
  private final SubmissionService submissions;

  public SubmissionRecoveryJob(SubmissionService submissions) {
    this.submissions = submissions;
  }

  @Scheduled(fixedDelayString = "${app.submissions.recovery.poll-delay-ms:5000}")
  public void recover() {
    submissions.recoverStuckSubmissions();
  }
}
