package com.qlc.services;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class CartService {

  private static final String CART_KEY_PREFIX = "cart:";
  private static final long CART_TTL_DAYS = 7;

  private final StringRedisTemplate redisTemplate;

  public CartService(StringRedisTemplate redisTemplate) {
    this.redisTemplate = redisTemplate;
  }

  public void addCourse(Long userId, Long courseId) {
    String key = cartKey(userId);
    redisTemplate.opsForSet().add(key, String.valueOf(courseId));
    redisTemplate.expire(key, CART_TTL_DAYS, TimeUnit.DAYS);
  }

  public void removeCourse(Long userId, Long courseId) {
    redisTemplate.opsForSet().remove(cartKey(userId), String.valueOf(courseId));
  }

  public Set<Long> getCourseIds(Long userId) {
    Set<String> members = redisTemplate.opsForSet().members(cartKey(userId));
    if (members == null || members.isEmpty()) {
      return Collections.emptySet();
    }
    return members.stream()
        .map(Long::valueOf)
        .collect(Collectors.toSet());
  }

  public void clear(Long userId) {
    redisTemplate.delete(cartKey(userId));
  }

  private String cartKey(Long userId) {
    return CART_KEY_PREFIX + userId;
  }
}
