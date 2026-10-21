package com.qlc.api.models.dtos;

import java.math.BigDecimal;
import java.util.List;

public record CourseDTO(Long id, String name, String description, BigDecimal price, BigDecimal priceInStars,
                        Boolean multilingual, List<String> availableLanguages) {
  public CourseDTO(Long id, String name, String description, BigDecimal price, BigDecimal priceInStars) {
    this(id, name, description, price, priceInStars, null, null);
  }
}
