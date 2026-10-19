package com.qlc.services;

import com.qlc.models.entities.AccountEmailToken;
import com.qlc.models.entities.User;
import com.qlc.models.enums.AccountEmailTokenPurpose;
import com.qlc.repositories.AccountEmailTokenRepository;
import com.qlc.repositories.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountEmailService {
  private static final SecureRandom RANDOM = new SecureRandom();
  private static final int COOLDOWN_SECONDS = 60;
  private final UserRepository users;
  private final AccountEmailTokenRepository tokens;
  private final PasswordEncoder passwordEncoder;
  private final AccountEmailSender sender;
  private final String frontendUrl;

  public AccountEmailService(UserRepository users, AccountEmailTokenRepository tokens,
      PasswordEncoder passwordEncoder, AccountEmailSender sender,
      @Value("${app.frontend-url}") String frontendUrl) {
    this.users = users;
    this.tokens = tokens;
    this.passwordEncoder = passwordEncoder;
    this.sender = sender;
    this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    if (!this.frontendUrl.startsWith("https://")
        && !this.frontendUrl.startsWith("http://127.0.0.1:")
        && !this.frontendUrl.startsWith("http://localhost:")) {
      throw new IllegalArgumentException("FRONTEND_PUBLIC_URL must be HTTPS or local HTTP");
    }
  }

  @Transactional
  public void requestVerification(String email) {
    users.findByEmailIgnoreCase(email.trim()).ifPresent(this::issueVerification);
  }

  @Transactional
  public void issueVerification(User user) {
    if (user.isEmailVerified() || !hasRealEmail(user)) {
      return;
    }
    issue(user, AccountEmailTokenPurpose.VERIFY_EMAIL, 24 * 60,
        "Подтвердите почту QLC", "/verify-email?token=",
        "Подтвердите адрес электронной почты, открыв ссылку ниже. Она действует 24 часа:");
  }

  @Transactional
  public void verifyEmail(String rawToken) {
    AccountEmailToken token = findValidToken(rawToken, AccountEmailTokenPurpose.VERIFY_EMAIL);
    User user = users.findById(token.getUserId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ссылка недействительна"));
    user.setEmailVerified(true);
    tokens.deleteByUserIdAndPurpose(user.getId(), AccountEmailTokenPurpose.VERIFY_EMAIL);
  }

  @Transactional
  public void requestPasswordReset(String email) {
    users.findByEmailIgnoreCase(email.trim()).ifPresent(user -> {
      if (!hasRealEmail(user)) {
        return;
      }
      issue(user, AccountEmailTokenPurpose.RESET_PASSWORD, 30,
          "Сброс пароля QLC", "/reset-password?token=",
          "Чтобы задать новый пароль, откройте ссылку ниже. Она действует 30 минут. Если вы не запрашивали сброс, просто проигнорируйте письмо:");
    });
  }

  @Transactional
  public void resetPassword(String rawToken, String newPassword) {
    AccountEmailToken token = findValidToken(rawToken, AccountEmailTokenPurpose.RESET_PASSWORD);
    User user = users.findById(token.getUserId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ссылка недействительна"));
    if (!hasRealEmail(user)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ссылка недействительна");
    }
    user.setPassword(passwordEncoder.encode(newPassword));
    // Possession of the one-time link also proves control of this mailbox.
    user.setEmailVerified(true);
    user.setAuthVersion(user.getAuthVersion() + 1);
    tokens.deleteByUserIdAndPurpose(user.getId(), AccountEmailTokenPurpose.RESET_PASSWORD);
  }

  @Scheduled(fixedDelay = 3_600_000)
  @Transactional
  public void removeExpiredTokens() {
    tokens.deleteByExpiresAtBefore(LocalDateTime.now());
  }

  private void issue(User user, AccountEmailTokenPurpose purpose, int validMinutes,
      String subject, String linkPath, String introduction) {
    LocalDateTime now = LocalDateTime.now();
    if (tokens.existsByUserIdAndPurposeAndCreatedAtAfter(user.getId(), purpose,
        now.minusSeconds(COOLDOWN_SECONDS))) {
      return;
    }
    tokens.deleteByUserIdAndPurpose(user.getId(), purpose);
    byte[] random = new byte[32];
    RANDOM.nextBytes(random);
    String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
    AccountEmailToken token = new AccountEmailToken();
    token.setUserId(user.getId());
    token.setPurpose(purpose);
    token.setTokenHash(sha256(rawToken));
    token.setCreatedAt(now);
    token.setExpiresAt(now.plusMinutes(validMinutes));
    tokens.save(token);
    String body = introduction + "\n\n" + frontendUrl + linkPath + rawToken + "\n\nQLC";
    if (TransactionSynchronizationManager.isActualTransactionActive()) {
      TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
        @Override
        public void afterCommit() {
          sender.send(user.getEmail(), subject, body);
        }
      });
    } else {
      sender.send(user.getEmail(), subject, body);
    }
  }

  private AccountEmailToken findValidToken(String rawToken, AccountEmailTokenPurpose purpose) {
    if (rawToken == null || !rawToken.matches("[A-Za-z0-9_-]{43}")) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ссылка недействительна или устарела");
    }
    return tokens.findByTokenHashAndPurpose(sha256(rawToken), purpose)
        .filter(token -> token.getExpiresAt().isAfter(LocalDateTime.now()))
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ссылка недействительна или устарела"));
  }

  private static boolean hasRealEmail(User user) {
    String email = user.getEmail();
    return email != null && !email.toLowerCase(Locale.ROOT).endsWith("@telegram.local");
  }

  private static String sha256(String value) {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(digest);
    } catch (java.security.NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 is unavailable", e);
    }
  }
}
