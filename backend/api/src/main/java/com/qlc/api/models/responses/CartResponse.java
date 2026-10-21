package com.qlc.api.models.responses;

import java.util.Set;

public record CartResponse(Set<Long> courseIds) {
}
