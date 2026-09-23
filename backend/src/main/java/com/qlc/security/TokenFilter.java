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
import io.jsonwebtoken.Claims;

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
          if (role == null || rawUserId == null) {
            throw new IllegalArgumentException("Token is missing required claims");
          }

          UserDetails userDetails = email == null
              ? userDetailsService.loadUserByUsername(username)
              : UserDetailsImpl.fromToken(rawUserId.longValue(), username, email, role);
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
