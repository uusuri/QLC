package com.qlc.controllers;

import com.qlc.models.entities.User;
import com.qlc.models.enums.Role;
import com.qlc.models.requests.AuthLoginRequest;
import com.qlc.models.requests.AuthRegisterRequest;
import com.qlc.models.requests.AccountEmailRequest;
import com.qlc.models.requests.AccountTokenRequest;
import com.qlc.models.requests.PasswordResetRequest;
import com.qlc.models.requests.TelegramAuthRequest;
import com.qlc.models.responses.AuthResponse;
import com.qlc.repositories.UserRepository;
import com.qlc.security.JWTCore;
import com.qlc.security.UserDetailsImpl;
import com.qlc.services.TelegramAuthService;
import com.qlc.services.AccountEmailService;
import jakarta.validation.Valid;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final AuthenticationManager authenticationManager;
  private final JWTCore jwtCore;
  private final TelegramAuthService telegramAuthService;
  private final AccountEmailService accountEmailService;

  public AuthController(UserRepository userRepository,
      PasswordEncoder passwordEncoder,
      AuthenticationManager authenticationManager,
      JWTCore jwtCore,
      TelegramAuthService telegramAuthService,
      AccountEmailService accountEmailService) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.authenticationManager = authenticationManager;
    this.jwtCore = jwtCore;
    this.telegramAuthService = telegramAuthService;
    this.accountEmailService = accountEmailService;
  }

  @PostMapping("/register")
  @Transactional
  public ResponseEntity<?> register(@Valid @RequestBody AuthRegisterRequest request) {
    if (userRepository.existsByUsername(request.username())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is already taken");
    }

    String email = request.email().trim().toLowerCase(java.util.Locale.ROOT);
    if (userRepository.existsByEmailIgnoreCase(email)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is already in use");
    }

    User user = new User();
    user.setUsername(request.username());
    user.setEmail(email);
    user.setPassword(passwordEncoder.encode(request.password()));
    user.setEmailVerified(false);
    user.setRole(Role.ROLE_USER);
    user.setRegistrationDate(LocalDateTime.now());

    User saved = userRepository.save(user);
    accountEmailService.issueVerification(saved);

    AuthResponse response = new AuthResponse(
        generateTokenForUser(saved),
        userInfo(saved));

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@Valid @RequestBody AuthLoginRequest request) {
    Authentication auth;
    try {
      auth = authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(request.username(), request.password()));
    } catch (BadCredentialsException e) {
      throw new BadCredentialsException("Invalid username or password");
    }

    String jwt = jwtCore.generateToken(auth);

    UserDetailsImpl principal = (UserDetailsImpl) auth.getPrincipal();
    User user = userRepository.findByUsername(principal.getUsername())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

    AuthResponse response = new AuthResponse(
        jwt,
        userInfo(user));

    return ResponseEntity.ok(response);
  }

  @PostMapping("/telegram")
  public ResponseEntity<AuthResponse> loginWithTelegram(@Valid @RequestBody TelegramAuthRequest request) {
    User user = telegramAuthService.authenticate(request);
    return ResponseEntity.ok(new AuthResponse(
        generateTokenForUser(user),
        userInfo(user)));
  }

  @PostMapping("/email-verification/request")
  public ResponseEntity<Void> requestEmailVerification(@Valid @RequestBody AccountEmailRequest request) {
    accountEmailService.requestVerification(request.email());
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/email-verification/confirm")
  public ResponseEntity<Void> confirmEmailVerification(@Valid @RequestBody AccountTokenRequest request) {
    accountEmailService.verifyEmail(request.token());
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/password-reset/request")
  public ResponseEntity<Void> requestPasswordReset(@Valid @RequestBody AccountEmailRequest request) {
    accountEmailService.requestPasswordReset(request.email());
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/password-reset/confirm")
  public ResponseEntity<Void> confirmPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
    accountEmailService.resetPassword(request.token(), request.password());
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/me")
  public ResponseEntity<AuthResponse.UserInfo> me(@AuthenticationPrincipal UserDetailsImpl principal) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
    }

    return ResponseEntity.ok(new AuthResponse.UserInfo(
        principal.getId(),
        principal.getUsername(),
        principal.getEmail(),
        principal.getRole(),
        principal.isEmailVerified()));
  }

  private AuthResponse.UserInfo userInfo(User user) {
    return new AuthResponse.UserInfo(user.getId(), user.getUsername(), user.getEmail(),
        user.getRole().name(), user.isEmailVerified());
  }

  private String generateTokenForUser(User user) {
    UserDetailsImpl details = UserDetailsImpl.build(user);
    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(details, null,
        details.getAuthorities());
    return jwtCore.generateToken(auth);
  }

}
