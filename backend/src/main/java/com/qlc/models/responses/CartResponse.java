package com.qlc.models.responses;

import java.util.Set;

public record CartResponse(Set<Long> courseIds) {
}
