package com.qlc.models.dtos;

import java.math.BigDecimal;

/** Данные карточки курса, включая уже посчитанное количество опубликованных уроков. */
public record CourseCatalogDTO(
    Long id,
    String name,
    String description,
    BigDecimal price,
    BigDecimal priceInStars,
    Long lessonsCount) {
}
