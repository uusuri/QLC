package com.qlc.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.security.Keys;

@Component
public class JWTCore {

  // Ключ должен быть длинным (минимум 64 символа для HS512)
  @Value("${jwt.secret:UusuriKeyForJWTTokenGenerationAndValidation1234567890_SuperLongSecretKeyForHS512Algorithm}")
  private String jwtSecret;

  // 24 часа по умолчанию: 60 секунд приводили к постоянным 401 в админке.
  @Value("${jwt.expiration:86400000}")
  private Long jwtExpiration;

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
        .claim("email", userDetails != null ? userDetails.getEmail() : null)
        .issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + jwtExpiration))
        .signWith(getSigningKey()) // Алгоритм HS512 либа выберет автоматически на основе длины ключа
        .compact();
  }

  public String extractUsername(String token) {
    return getClaims(token).getSubject();
  }

  public String extractRole(String token) {
    return getClaims(token).get("role", String.class);
  }

  public Long extractUserId(String token) {
    Number userId = getClaims(token).get("userId", Number.class);
    return userId == null ? null : userId.longValue();
  }

  public boolean isTokenValid(String token, UserDetails userDetails) {
    try {
      Claims claims = getClaims(token);
      String username = claims.getSubject();
      Date expiration = claims.getExpiration();
      return username.equals(userDetails.getUsername()) && expiration.after(new Date());
    } catch (Exception e) {
      return false;
    }
  }

  public Claims parseClaims(String token) {
    return getClaims(token);
  }

  public boolean isTokenValid(Claims claims) {
    return claims.getSubject() != null
        && claims.getExpiration() != null
        && claims.getExpiration().after(new Date());
  }

  private Claims getClaims(String token) {
    return Jwts.parser()
        .verifyWith(getSigningKey())
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }
}
