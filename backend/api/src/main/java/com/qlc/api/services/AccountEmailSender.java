package com.qlc.api.services;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

@Service
public class AccountEmailSender {
  private static final Logger log = LoggerFactory.getLogger(AccountEmailSender.class);
  private static final URI RESEND_EMAILS = URI.create("https://api.resend.com/emails");
  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private final String from;
  private final String apiKey;
  private final boolean enabled;

  public AccountEmailSender(ObjectMapper objectMapper,
      @Value("${app.mail.from}") String from,
      @Value("${app.mail.enabled:true}") boolean enabled,
      @Value("${app.mail.resend-api-key:}") String apiKey) {
    if (enabled && apiKey.isBlank()) {
      throw new IllegalStateException("RESEND_API_KEY is required when account mail is enabled");
    }
    this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    this.objectMapper = objectMapper;
    this.from = from;
    this.apiKey = apiKey;
    this.enabled = enabled;
  }

  @Async("accountMailExecutor")
  public void send(String recipient, String subject, String body) {
    if (!enabled) {
      return;
    }
    try {
      String json = objectMapper.writeValueAsString(Map.of(
          "from", from, "to", List.of(recipient), "subject", subject, "text", body));
      HttpRequest request = HttpRequest.newBuilder(RESEND_EMAILS)
          .timeout(Duration.ofSeconds(10))
          .header("Authorization", "Bearer " + apiKey)
          .header("Content-Type", "application/json")
          .POST(HttpRequest.BodyPublishers.ofString(json))
          .build();
      HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        log.error("Account email delivery rejected by provider; HTTP status={}", response.statusCode());
      }
    } catch (Exception e) {
      // Never log the body: it contains a one-time secret link.
      log.error("Account email delivery failed: {}", e.getClass().getSimpleName());
      if (e instanceof InterruptedException) {
        Thread.currentThread().interrupt();
      }
    }
  }
}
