package com.qlc.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Component
public class JWTCore {

  // Ключ должен быть длинным (минимум 64 символа для HS512)
  @Value("${jwt.secret:UusuriKeyForJWTTokenGenerationAndValidation1234567890_SuperLongSecretKeyForHS512Algorithm}")
  private String jwtSecret;

  @Value("${jwt.expiration:60000}")
  private Long jwtExpiration;

  // В jjwt 0.12.x используется SecretKey вместо SecretKeySpec
  private SecretKey getSigningKey() {
    return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
  }

  public String generateToken(Authentication authentication) {
    UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

    String username = userDetails != null ? userDetails.getUsername() : "anonymous";
    String role = userDetails != null ? userDetails.getRole() : "";
    Long userId = userDetails != null ? userDetails.getId() : null;

    return Jwts.builder()
        .subject(username)
        .claim("role", role)
        .claim("userId", userId)
        .issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
        .signWith(getSigningKey()) // Алгоритм HS512 либа выберет автоматически на основе длины ключа
        .compact();
  }

  public String extractUsername(String token) {
    return Jwts.parser()
        .verifyWith(getSigningKey())
        .build()
        .parseSignedClaims(token)
        .getPayload()
        .getSubject();
  }

  public String extractRole(String token) {
    return Jwts.parser()
        .verifyWith(getSigningKey())
        .build()
        .parseSignedClaims(token)
        .getPayload()
        .get("role", String.class);
  }

  public Long extractUserId(String token) {
    return Jwts.parser()
        .verifyWith(getSigningKey())
        .build()
        .parseSignedClaims(token)
        .getPayload()
        .get("userId", Long.class);
  }

  public boolean isTokenValid(String token, UserDetails userDetails) {
    try {
      String username = extractUsername(token);
      Date expiration = Jwts.parser()
          .verifyWith(getSigningKey())
          .build()
          .parseSignedClaims(token)
          .getPayload()
          .getExpiration();
      return username.equals(userDetails.getUsername()) && expiration.after(new Date());
    } catch (Exception e) {
      return false;
    }
  }
}
