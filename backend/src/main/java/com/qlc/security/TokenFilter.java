package com.qlc.security;

import com.qlc.models.entities.User;
import com.qlc.repositories.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import io.jsonwebtoken.Claims;

@Component
public class TokenFilter extends OncePerRequestFilter {

  private final JWTCore jwtCore;
  private final UserRepository users;

  public TokenFilter(JWTCore jwtCore, UserRepository users) {
    this.jwtCore = jwtCore;
    this.users = users;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {

    String authHeader = request.getHeader("Authorization");

    if (authHeader != null && authHeader.startsWith("Bearer ")) {
      String jwt = authHeader.substring(7);
      try {
        Claims claims = jwtCore.parseClaims(jwt);
        if (jwtCore.isTokenValid(claims)) {
          String username = claims.getSubject();
          String role = claims.get("role", String.class);
          String email = claims.get("email", String.class);
          Number rawUserId = claims.get("userId", Number.class);
          Number rawAuthVersion = claims.get("authVersion", Number.class);
          if (role == null || email == null || rawUserId == null || rawAuthVersion == null) {
            throw new IllegalArgumentException("Token is missing required claims");
          }

          User user = users.findById(rawUserId.longValue())
              .orElseThrow(() -> new IllegalArgumentException("User no longer exists"));
          if (!user.getUsername().equals(username) || !user.getEmail().equals(email)
              || !user.getRole().name().equals(role)
              || user.getAuthVersion() != rawAuthVersion.intValue()) {
            throw new IllegalArgumentException("Token was revoked");
          }
          UserDetailsImpl userDetails = UserDetailsImpl.build(user);
          UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
              userDetails, null, userDetails.getAuthorities());
          SecurityContextHolder.getContext().setAuthentication(auth);
        }
      } catch (Exception e) {
        SecurityContextHolder.clearContext();
      }
    }

    filterChain.doFilter(request, response);
  }
}
