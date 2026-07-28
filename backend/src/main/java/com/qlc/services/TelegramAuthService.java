package com.qlc.services;

import com.qlc.models.entities.User;
import com.qlc.models.enums.Role;
import com.qlc.models.requests.TelegramAuthRequest;
import com.qlc.repositories.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
@Transactional
public class TelegramAuthService {

  private static final long MAX_AUTH_AGE_SECONDS = 300;

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final String botToken;

  public TelegramAuthService(UserRepository userRepository, PasswordEncoder passwordEncoder,
      @Value("${telegram.bot-token:}") String botToken) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.botToken = botToken;
  }

  public User authenticate(TelegramAuthRequest request) {
    verify(request);

    return userRepository.findByTgId(request.id())
        .orElseGet(() -> userRepository.save(createUser(request)));
  }

  private void verify(TelegramAuthRequest request) {
    if (botToken.isBlank()) {
      throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Telegram login is not configured");
    }

    long ageSeconds = Instant.now().getEpochSecond() - request.authDate();
    if (ageSeconds < -30 || ageSeconds > MAX_AUTH_AGE_SECONDS || !isValidHash(request)) {
      throw new ResponseStatusException(UNAUTHORIZED, "Telegram authorization is invalid or expired");
    }
  }

  private boolean isValidHash(TelegramAuthRequest request) {
    try {
      List<String> fields = new ArrayList<>();
      addField(fields, "auth_date", String.valueOf(request.authDate()));
      addField(fields, "first_name", request.firstName());
      addField(fields, "id", String.valueOf(request.id()));
      addField(fields, "last_name", request.lastName());
      addField(fields, "photo_url", request.photoUrl());
      addField(fields, "username", request.username());
      fields.sort(Comparator.naturalOrder());

      byte[] secret = MessageDigest.getInstance("SHA-256")
          .digest(botToken.getBytes(StandardCharsets.UTF_8));
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret, "HmacSHA256"));
      byte[] expected = mac.doFinal(String.join("\n", fields).getBytes(StandardCharsets.UTF_8));
      byte[] actual = hexToBytes(request.hash());

      return MessageDigest.isEqual(expected, actual);
    } catch (Exception exception) {
      return false;
    }
  }

  private User createUser(TelegramAuthRequest request) {
    User user = new User();
    user.setTgId(request.id());
    user.setUsername(nextUsername(request));
    user.setEmail("telegram-" + request.id() + "@telegram.local");
    user.setPassword(passwordEncoder.encode("telegram:" + request.id() + ":" + botToken));
    user.setRole(Role.ROLE_USER);
    user.setRegistrationDate(java.time.LocalDateTime.now());
    return user;
  }

  private String nextUsername(TelegramAuthRequest request) {
    String candidate = request.username() == null ? "" : request.username().replaceAll("[^A-Za-z0-9_]", "");
    if (candidate.length() < 3) {
      candidate = "telegram_user";
    }
    candidate = candidate.substring(0, Math.min(candidate.length(), 32));

    for (int attempt = 1; ; attempt++) {
      String suffix = attempt == 1 ? "" : "_" + attempt;
      String prefix = candidate.substring(0, Math.min(candidate.length(), 32 - suffix.length()));
      String username = prefix + suffix;
      if (!userRepository.existsByUsername(username)) {
        return username;
      }
    }
  }

  private void addField(List<String> fields, String key, String value) {
    if (value != null && !value.isBlank()) {
      fields.add(key + "=" + value);
    }
  }

  private byte[] hexToBytes(String value) {
    if (value.length() != 64) {
      throw new IllegalArgumentException("Invalid hash length");
    }

    byte[] bytes = new byte[value.length() / 2];
    for (int index = 0; index < value.length(); index += 2) {
      bytes[index / 2] = (byte) Integer.parseInt(value.substring(index, index + 2), 16);
    }
    return bytes;
  }
}
