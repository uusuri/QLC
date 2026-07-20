package com.qlc.controllers;

import com.qlc.models.requests.AddToCartRequest;
import com.qlc.models.responses.CartResponse;
import com.qlc.security.UserDetailsImpl;
import com.qlc.services.CartService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@CrossOrigin(origins = "*")
public class CartController {

  private final CartService cartService;

  public CartController(CartService cartService) {
    this.cartService = cartService;
  }

  @PostMapping("/items")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<CartResponse> addItem(@AuthenticationPrincipal UserDetailsImpl principal,
      @Valid @RequestBody AddToCartRequest request) {
    cartService.addCourse(principal.getId(), request.courseId());
    return ResponseEntity.ok(new CartResponse(cartService.getCourseIds(principal.getId())));
  }

  @GetMapping
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<CartResponse> getCart(@AuthenticationPrincipal UserDetailsImpl principal) {
    return ResponseEntity.ok(new CartResponse(cartService.getCourseIds(principal.getId())));
  }

  @DeleteMapping("/items/{courseId}")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<CartResponse> removeItem(@AuthenticationPrincipal UserDetailsImpl principal,
      @PathVariable Long courseId) {
    cartService.removeCourse(principal.getId(), courseId);
    return ResponseEntity.ok(new CartResponse(cartService.getCourseIds(principal.getId())));
  }
}
