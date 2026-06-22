package com.qlc.models.dtos;

import java.math.BigDecimal;

public record CourseDTO(Long id, String name, String description, BigDecimal price, BigDecimal priceInStars) {
}
