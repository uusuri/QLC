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

    String authHeader = request.getHeader("Authorization");
    System.out.println("DEBUG: Header: " + authHeader);

    if (authHeader != null && authHeader.startsWith("Bearer ")) {
      String jwt = authHeader.substring(7);
      try {
        String username = jwtCore.extractUsername(jwt);
        System.out.println("DEBUG: Username from JWT: " + username);

        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        System.out.println("DEBUG: User loaded from DB: " + userDetails.getUsername());

        if (jwtCore.isTokenValid(jwt, userDetails)) {
          UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
              userDetails, null, userDetails.getAuthorities());
          SecurityContextHolder.getContext().setAuthentication(auth);
          System.out.println("DEBUG: Authentication SUCCESSFUL");
        } else {
          System.out.println("DEBUG: Token INVALID");
        }
      } catch (Exception e) {
        System.out.println("DEBUG: Exception in Filter: " + e.getMessage());
        e.printStackTrace(); // ВАЖНО: это покажет полный стек ошибки
      }
    } else {
      System.out.println("DEBUG: Authorization header missing or invalid");
    }

    filterChain.doFilter(request, response);
  }
}
