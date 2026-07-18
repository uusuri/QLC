package com.qlc.controllers;

import com.qlc.models.entities.User;
import com.qlc.models.enums.Role;
import com.qlc.models.requests.AuthLoginRequest;
import com.qlc.models.requests.AuthRegisterRequest;
import com.qlc.models.responses.AuthResponse;
import com.qlc.repositories.UserRepository;
import com.qlc.security.JWTCore;
import com.qlc.security.UserDetailsImpl;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final AuthenticationManager authenticationManager;
  private final JWTCore jwtCore;

  public AuthController(UserRepository userRepository,
                        PasswordEncoder passwordEncoder,
                        AuthenticationManager authenticationManager,
                        JWTCore jwtCore) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.authenticationManager = authenticationManager;
    this.jwtCore = jwtCore;
  }

  @PostMapping("/register")
  public ResponseEntity<?> register(@Valid @RequestBody AuthRegisterRequest request) {
    if (userRepository.existsByUsername(request.username())) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST)
          .body("Username is already taken");
    }

    if (userRepository.existsByEmail(request.email())) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST)
          .body("Email is already in use");
    }

    User user = new User();
    user.setUsername(request.username());
    user.setEmail(request.email());
    user.setPassword(passwordEncoder.encode(request.password()));
    user.setRole(Role.ROLE_USER);
    user.setTgId(generateUniqueTgId());
    user.setRegistrationDate(LocalDateTime.now());

    User saved = userRepository.save(user);

    AuthResponse response = new AuthResponse(
        generateTokenForUser(saved),
        new AuthResponse.UserInfo(saved.getId(), saved.getUsername(), saved.getEmail(), saved.getRole().name())
    );

    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@Valid @RequestBody AuthLoginRequest request) {
    Authentication auth;
    try {
      auth = authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(request.username(), request.password()));
    } catch (BadCredentialsException e) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
          .body("Invalid username or password");
    }

    String jwt = jwtCore.generateToken(auth);

    UserDetailsImpl principal = (UserDetailsImpl) auth.getPrincipal();
    User user = userRepository.findByUsername(principal.getUsername())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

    AuthResponse response = new AuthResponse(
        jwt,
        new AuthResponse.UserInfo(user.getId(), user.getUsername(), user.getEmail(), user.getRole().name())
    );

    return ResponseEntity.ok(response);
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
        principal.getRole()
    ));
  }

  private String generateTokenForUser(User user) {
    UserDetailsImpl details = UserDetailsImpl.build(user);
    UsernamePasswordAuthenticationToken auth =
        new UsernamePasswordAuthenticationToken(details, null, details.getAuthorities());
    return jwtCore.generateToken(auth);
  }

  private Long generateUniqueTgId() {
    return System.nanoTime() + ThreadLocalRandom.current().nextLong(1_000_000);
  }
}
