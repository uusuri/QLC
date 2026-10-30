package com.qlc.api.controllers;

import com.qlc.api.models.dtos.FriendUser;
import com.qlc.api.security.UserDetailsImpl;
import com.qlc.api.services.UserAvatarService;
import com.qlc.api.services.UserProfileService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.time.LocalDate;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
public class UserProfileController {
  private final UserProfileService profiles;
  private final UserAvatarService avatars;

  public UserProfileController(UserProfileService profiles, UserAvatarService avatars) {
    this.profiles = profiles;
    this.avatars = avatars;
  }

  @GetMapping("/profiles/{username}")
  public ResponseEntity<UserProfileService.Profile> profile(@PathVariable String username,
      @AuthenticationPrincipal UserDetailsImpl principal) {
    return noStore(profiles.profile(username, viewer(principal)));
  }

  @GetMapping("/profiles/{username}/activity")
  public ResponseEntity<UserProfileService.Activity> activity(@PathVariable String username,
      @AuthenticationPrincipal UserDetailsImpl principal) {
    return noStore(profiles.activity(username, viewer(principal)));
  }

  @GetMapping("/profiles/{username}/friends")
  public ResponseEntity<List<FriendUser>> friends(@PathVariable String username,
      @AuthenticationPrincipal UserDetailsImpl principal) {
    return noStore(profiles.profileFriends(username, viewer(principal)));
  }

  @GetMapping("/profiles/{username}/avatar")
  public ResponseEntity<byte[]> avatar(@PathVariable String username,
      @AuthenticationPrincipal UserDetailsImpl principal) {
    Long userId = profiles.visibleUserId(username, viewer(principal));
    var avatar = avatars.findByUserId(userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Аватарка не загружена"));
    return ResponseEntity.ok().contentType(MediaType.parseMediaType(avatar.contentType()))
        .cacheControl(CacheControl.noStore()).varyBy("Authorization")
        .header("X-Content-Type-Options", "nosniff").body(avatar.image());
  }

  @GetMapping("/search")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<List<FriendUser>> search(@RequestParam String q,
      @AuthenticationPrincipal UserDetailsImpl principal) {
    return noStore(profiles.search(q, principal.getId()));
  }

  @PutMapping("/me/privacy")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<UserProfileService.Privacy> privacy(@Valid @RequestBody PrivacyRequest request,
      @AuthenticationPrincipal UserDetailsImpl principal) {
    return noStore(profiles.updatePrivacy(principal.getId(), request.privateProfile()));
  }

  @GetMapping("/me/activity")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<UserProfileService.DailySubmissions> dailySubmissions(@RequestParam LocalDate date,
      @RequestParam(defaultValue = "0") int page, @AuthenticationPrincipal UserDetailsImpl principal) {
    return noStore(profiles.dailySubmissions(principal.getId(), date, page));
  }

  private Long viewer(UserDetailsImpl principal) {
    return principal == null ? null : principal.getId();
  }

  private <T> ResponseEntity<T> noStore(T body) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).varyBy("Authorization").body(body);
  }

  public record PrivacyRequest(@NotNull Boolean privateProfile) {}
}
