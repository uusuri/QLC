package com.qlc.api.controllers;

import com.qlc.api.models.dtos.FriendRequests;
import com.qlc.api.models.dtos.FriendUser;
import com.qlc.api.security.UserDetailsImpl;
import com.qlc.api.services.FriendService;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/friends")
@PreAuthorize("isAuthenticated()")
public class FriendController {
  private final FriendService friends;

  public FriendController(FriendService friends) {
    this.friends = friends;
  }

  @GetMapping
  public ResponseEntity<List<FriendUser>> list(@AuthenticationPrincipal UserDetailsImpl principal) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(friends.listFriends(principal.getId()));
  }

  @GetMapping("/requests")
  public ResponseEntity<FriendRequests> requests(@AuthenticationPrincipal UserDetailsImpl principal) {
    return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(friends.requests(principal.getId()));
  }

  @PostMapping("/requests/{userId}")
  public ResponseEntity<Void> send(@PathVariable Long userId, @AuthenticationPrincipal UserDetailsImpl principal) {
    friends.sendRequest(principal.getId(), userId);
    return ResponseEntity.noContent().build();
  }

  @PutMapping("/requests/{userId}/accept")
  public ResponseEntity<Void> accept(@PathVariable Long userId, @AuthenticationPrincipal UserDetailsImpl principal) {
    friends.acceptRequest(principal.getId(), userId);
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/requests/{userId}")
  public ResponseEntity<Void> deleteRequest(@PathVariable Long userId,
      @AuthenticationPrincipal UserDetailsImpl principal) {
    friends.deleteRequest(principal.getId(), userId);
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/{userId}")
  public ResponseEntity<Void> removeFriend(@PathVariable Long userId,
      @AuthenticationPrincipal UserDetailsImpl principal) {
    friends.removeFriend(principal.getId(), userId);
    return ResponseEntity.noContent().build();
  }
}
