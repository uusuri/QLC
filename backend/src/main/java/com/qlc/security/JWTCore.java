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

  private final SecretKey signingKey;
  private final long jwtExpiration;

  public JWTCore(@Value("${jwt.secret}") String jwtSecret,
      @Value("${jwt.expiration:86400000}") long jwtExpiration) {
    if (jwtSecret.isBlank() || jwtSecret.getBytes(StandardCharsets.UTF_8).length < 64) {
      throw new IllegalArgumentException("JWT_SECRET must contain at least 64 UTF-8 bytes");
    }
    if (jwtExpiration <= 0) {
      throw new IllegalArgumentException("JWT_EXPIRATION must be positive");
    }
    this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    this.jwtExpiration = jwtExpiration;
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
        .signWith(signingKey, Jwts.SIG.HS512)
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
        .verifyWith(signingKey)
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }
}
