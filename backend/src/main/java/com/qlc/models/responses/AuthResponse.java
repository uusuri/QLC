package com.qlc.models.responses;

public record AuthResponse(
    String accessToken,
    String tokenType,
    UserInfo user) {

  public AuthResponse(String accessToken, UserInfo user) {
    this(accessToken, "Bearer", user);
  }

  public record UserInfo(
      Long id,
      String username,
      String email,
      String role) {
  }
}
