package com.qlc.api.models.dtos;

import java.util.List;

public record SubmissionHistoryPage(List<SubmissionHistoryItem> items, int page, boolean hasNext) {}
