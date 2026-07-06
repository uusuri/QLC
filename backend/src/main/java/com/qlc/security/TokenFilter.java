package com.qlc.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class TokenFilter extends OncePerRequestFilter {

  private final JWTCore jwtCore;
  private final UserDetailsService userDetailsService;

  public TokenFilter(JWTCore jwtCore, UserDetailsService userDetailsService) {
    this.jwtCore = jwtCore;
    this.userDetailsService = userDetailsService;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String username = null;
    String jwt = null;

    try {
      String authHeader = request.getHeader("Authorization");
      if (authHeader != null && authHeader.startsWith("Bearer ")) {
        jwt = authHeader.substring(7);

        if (jwt.startsWith("mock-auth-token")) {
          String[] parts = jwt.split("\\.");
          username = (parts.length > 1) ? parts[1] : "uusuri";
        } else {
          username = jwtCore.extractUsername(jwt);
        }
      }

      if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
        UserDetails userDetails;

        if (jwt != null && jwt.startsWith("mock-auth-token")) {
          // Создаем фейкового юзера без обращения к PostgreSQL
          userDetails = org.springframework.security.core.userdetails.User.builder()
              .username(username)
              .password("") // пароль для контекста не важен
              .authorities("ROLE_USER") // или какая роль тебе сейчас нужна
              .build();
        } else {
          // Для реальных токенов идем честно в базу
          userDetails = userDetailsService.loadUserByUsername(username);
        }

        boolean isValid = jwt.startsWith("mock-auth-token") || jwtCore.isTokenValid(jwt, userDetails);

        if (isValid) {
          UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken(
              userDetails, null, userDetails.getAuthorities());
          SecurityContextHolder.getContext().setAuthentication(token);
        }
      }

    } catch (Exception e) {
      System.out.println("Cannot set user authentication: " + e.getMessage());
    }

    filterChain.doFilter(request, response);
  }
}
