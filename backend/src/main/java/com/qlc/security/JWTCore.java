package com.qlc.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.spec.SecretKeySpec;
import java.util.Date;

@Component
public class JWTCore {

  @Value("${jwt.secret:UusuriKeyForJWTTokenGenerationAndValidation1234567890}")
  private String jwtSecret;

  @Value("${jwt.expiration:60000}")
  private Long jwtExpiration;

  private SecretKeySpec getSigningKey() {
    byte[] decodedKey = java.util.Base64.getEncoder()
        .encode(jwtSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    decodedKey = java.util.Base64.getDecoder().decode(decodedKey);
    return new SecretKeySpec(decodedKey, 0, decodedKey.length, "HmacSHA512");
  }

  public String generateToken(Authentication authentication) {
    UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

    String username = userDetails != null ? userDetails.getUsername() : "anonymous";
    String role = userDetails != null ? userDetails.user().getRole().toString() : "";
    Long userId = userDetails != null ? userDetails.user().getId() : null;

    return Jwts.builder()
        .setSubject(username)
        .claim("role", role)
        .claim("userId", userId)
        .setIssuedAt(new Date())
        .setExpiration(new Date(System.currentTimeMillis() + jwtExpiration))
        .signWith(SignatureAlgorithm.HS512, getSigningKey())
        .compact();
  }

  public String extractUsername(String token) {
    return Jwts.parser()
        .setSigningKey(getSigningKey())
        .parseClaimsJws(token)
        .getBody()
        .getSubject();
  }

  public String extractRole(String token) {
    return Jwts.parser()
        .setSigningKey(getSigningKey())
        .parseClaimsJws(token)
        .getBody()
        .get("role", String.class);
  }

  public Long extractUserId(String token) {
    return Jwts.parser()
        .setSigningKey(getSigningKey())
        .parseClaimsJws(token)
        .getBody()
        .get("userId", Long.class);
  }

  public boolean isTokenValid(String token, UserDetails userDetails) {
    try {
      String username = extractUsername(token);
      Date expiration = Jwts.parser()
          .setSigningKey(getSigningKey())
          .parseClaimsJws(token)
          .getBody()
          .getExpiration();
      return username.equals(userDetails.getUsername()) && expiration.after(new Date());
    } catch (Exception e) {
      return false;
    }
  }
}
